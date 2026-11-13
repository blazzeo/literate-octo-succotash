// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract VendorFabric {
    address public immutable owner;
    mapping(bytes16 => address) public vendors; // vendorId -> Vendor contract
    mapping(address => bytes16) public ownerToVendorId; // vendor owner EOA -> vendorId

    enum OrderEventType {
        Created,
        Approved,
        Paid,
        Sold,
        Delivered,
        Cancelled
    }

    event VendorAdded(bytes16 indexed vendorId, address indexed vendorAddress);
    event VendorRemoved(
        bytes16 indexed vendorId,
        address indexed vendorAddress
    );

    event GlobalOrderEvent(
        bytes16 indexed vendorId,
        bytes16 indexed orderId,
        bytes16 indexed customerId,
        uint8 eventType,
        address orderAddress
    );

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    /// Register vendor: one vendor per owner (EOA).
    function addVendor(bytes16 vendor_id) external {
        require(vendor_id != bytes16(0), "vendor_id cannot be zero");
        require(vendors[vendor_id] == address(0), "Vendor already exists");
        require(
            ownerToVendorId[msg.sender] == bytes16(0),
            "Owner already has vendor"
        );

        Vendor new_vendor = new Vendor(msg.sender, vendor_id, address(this));
        vendors[vendor_id] = address(new_vendor);
        ownerToVendorId[msg.sender] = vendor_id;

        emit VendorAdded(vendor_id, address(new_vendor));
    }

    /// Allows vendor contract to unregister itself. Clears mapping for owner -> vendorId too.
    function removeVendor(bytes16 vendorId) external {
        address vendorAddr = vendors[vendorId];
        require(vendorAddr != address(0), "Vendor not found");
        require(
            vendorAddr == msg.sender,
            "Only vendor contract can remove itself"
        );

        // get owner from vendor contract to clear ownerToVendorId
        address vendorOwner = Vendor(payable(vendorAddr)).owner();
        delete vendors[vendorId];
        if (ownerToVendorId[vendorOwner] == vendorId) {
            delete ownerToVendorId[vendorOwner];
        }

        emit VendorRemoved(vendorId, vendorAddr);
    }

    function getVendor(
        bytes16 vendor_id
    ) external view returns (address vendor_address) {
        vendor_address = vendors[vendor_id];
        require(vendor_address != address(0), "Vendor not found");
    }

    function getVendorByOwner(
        address vendorOwner
    ) external view returns (address vendor_address) {
        bytes16 vId = ownerToVendorId[vendorOwner];
        vendor_address = vendors[vId];
        require(vendor_address != address(0), "Vendor not found");
    }

    /// Only registered Vendor contract or corresponding Order contract (that reports matching vendorId) is allowed to emit.
    /// Orders will call Vendor.notifyFabricFromOrder(...) which calls this function,
    /// so the simple require below (msg.sender == registered Vendor) is sufficient.
    function emitOrderEvent(
        bytes16 vendorId,
        bytes16 orderId,
        bytes16 customerId,
        uint8 eventType,
        address orderAddress
    ) external {
        require(vendors[vendorId] == msg.sender, "Not authorized vendor");
        emit GlobalOrderEvent(
            vendorId,
            orderId,
            customerId,
            eventType,
            orderAddress
        );
    }
}

contract Vendor {
    address payable public immutable owner; // EOA that registered
    bytes16 public immutable vendorId;
    VendorFabric public immutable fabric;

    mapping(bytes16 => address) public orders; // orderId -> Order contract address
    bool public isActive = true;
    bytes16[] public orderIds;

    event VendorDeactivated(
        bytes16 indexed vendorId,
        address indexed vendorAddress
    );
    event VendorActivated(
        bytes16 indexed vendorId,
        address indexed vendorAddress
    );

    constructor(
        address vendor_address,
        bytes16 _vendorId,
        address fabricAddress
    ) {
        owner = payable(vendor_address);
        vendorId = _vendorId;
        fabric = VendorFabric(fabricAddress);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyActive() {
        require(isActive, "Vendor is deactivated");
        _;
    }

    function getOrder(bytes16 orderId) external view returns (address) {
        return orders[orderId];
    }

    /// Customer creates order. Vendor must be active.
    function createOrder(
        bytes16 customerId,
        bytes16 orderId,
        uint256 totalAmount
    ) external onlyActive {
        require(orders[orderId] == address(0), "Order already exists");
        // create new Order, pass vendor owner (EOA) and vendor contract (address(this))
        Order newOrder = new Order(
            payable(msg.sender), // customer EOA
            owner, // vendor owner EOA
            address(this), // vendor contract address
            orderId,
            customerId,
            vendorId,
            totalAmount,
            address(fabric)
        );
        orders[orderId] = address(newOrder);
        orderIds.push(orderId);

        // Emit global Created event via fabric (vendor contract is msg.sender here)
        fabric.emitOrderEvent(
            vendorId,
            orderId,
            customerId,
            uint8(VendorFabric.OrderEventType.Created),
            address(newOrder)
        );
    }

    /// Called by Order contract to notify Fabric via Vendor (ensures Fabric sees msg.sender == Vendor contract)
    function notifyFabricFromOrder(
        bytes16 orderId,
        bytes16 customerId,
        uint8 eventType,
        address orderAddress
    ) external {
        // Only the registered Order contract for this orderId may call
        require(orders[orderId] == msg.sender, "Only order contract");
        fabric.emitOrderEvent(
            vendorId,
            orderId,
            customerId,
            eventType,
            orderAddress
        );
    }

    /// Deactivate vendor (no refunds performed). Use batch refunds for refunding.
    function deactivate() external onlyOwner onlyActive {
        isActive = false;
        emit VendorDeactivated(vendorId, address(this));
    }

    /// Activate vendor.
    function activate() external onlyOwner {
        require(!isActive, "Already activated");
        isActive = true;
        emit VendorActivated(vendorId, address(this));
    }

    /// Batch deactivate and refund: process refunds in batches to avoid gas limit issues.
    /// It will mark vendor inactive at the start and then process orders[start..start+count).
    /// Each order is asked to cancelByVendor(); failures are caught and ignored so batch continues.
    function deactivateAndRefundBatch(
        uint256 startIndex,
        uint256 count
    ) external onlyOwner onlyActive {
        isActive = false;
        emit VendorDeactivated(vendorId, address(this));

        uint256 end = startIndex + count;
        if (end > orderIds.length) {
            end = orderIds.length;
        }

        for (uint256 i = startIndex; i < end; i++) {
            bytes16 oid = orderIds[i];
            address ordAddr = orders[oid];
            if (ordAddr == address(0)) continue;

            // call cancelByVendor on Order; use try/catch to avoid revert on single failure
            try Order(payable(ordAddr)).cancelByVendor() {
                // success or no-op
            } catch {
                // ignore and continue
            }
        }
    }

    /// number of orders for off-chain iteration
    function ordersCount() external view returns (uint256) {
        return orderIds.length;
    }
}

contract Order {
    address payable public immutable customer;
    address payable public immutable vendorOwner; // vendor EOA (owner)
    address public immutable vendorContract; // vendor contract address
    bytes16 public immutable orderId;
    bytes16 public immutable customerId;
    bytes16 public immutable vendorId;
    uint256 public immutable totalAmount;
    VendorFabric public immutable fabric;

    enum Status {
        Created,
        Approved,
        Paid,
        Sold,
        Delivered,
        Cancelled
    }
    Status public status;

    constructor(
        address payable _customer,
        address payable _vendorOwner,
        address _vendorContract,
        bytes16 _orderId,
        bytes16 _customerId,
        bytes16 _vendorId,
        uint256 _totalAmount,
        address fabricAddress
    ) payable {
        customer = _customer;
        vendorOwner = _vendorOwner;
        vendorContract = _vendorContract;
        orderId = _orderId;
        customerId = _customerId;
        vendorId = _vendorId;
        totalAmount = _totalAmount;
        fabric = VendorFabric(fabricAddress);

        status = Status.Created;
        // Note: Created event is emitted by Vendor.createOrder after storing the order mapping.
    }

    modifier onlyVendorOwner() {
        require(msg.sender == vendorOwner, "Unauthorized vendor owner");
        _;
    }

    modifier onlyCustomer() {
        require(msg.sender == customer, "Only customer");
        _;
    }

    /// Approve by vendor owner (EOA). After changing state, notify fabric via vendor contract.
    function approve() external onlyVendorOwner {
        require(status == Status.Created, "Invalid status");
        status = Status.Approved;
        // notify fabric via vendor contract (vendor contract will call fabric)
        Vendor(payable(vendorContract)).notifyFabricFromOrder(
            orderId,
            customerId,
            uint8(VendorFabric.OrderEventType.Approved),
            address(this)
        );
    }

    /// Customer deposits exact totalAmount. State is updated first, then notify.
    function deposit() external payable onlyCustomer {
        require(status == Status.Approved, "Order not approved");
        require(msg.value == totalAmount, "Wrong amount");

        status = Status.Paid;
        // notify fabric via vendor contract
        Vendor(payable(vendorContract)).notifyFabricFromOrder(
            orderId,
            customerId,
            uint8(VendorFabric.OrderEventType.Paid),
            address(this)
        );
    }

    /// Vendor owner finalizes sale and receives funds.
    function sell() external onlyVendorOwner {
        require(status == Status.Paid, "Not paid");
        status = Status.Sold;

        Vendor(payable(vendorContract)).notifyFabricFromOrder(
            orderId,
            customerId,
            uint8(VendorFabric.OrderEventType.Sold),
            address(this)
        );
    }

    function delivered() external onlyCustomer {
        require(status == Status.Sold, "Not sold");
        status = Status.Delivered;

        // transfer totalAmount to vendorOwner
        (bool ok, ) = vendorOwner.call{value: totalAmount}("");
        require(ok, "Transfer failed");

        Vendor(payable(vendorContract)).notifyFabricFromOrder(
            orderId,
            customerId,
            uint8(VendorFabric.OrderEventType.Delivered),
            address(this)
        );
    }

    /// Cancelable by customer or vendor owner. Refund performed if Paid.
    function cancel() external {
        require(
            msg.sender == customer || msg.sender == vendorOwner,
            "Unauthorized"
        );
        require(
            status == Status.Created ||
                status == Status.Approved ||
                status == Status.Paid,
            "Cannot cancel"
        );

        bool wasPaid = (status == Status.Paid);
        // effect first
        status = Status.Cancelled;

        if (wasPaid) {
            // interaction after effects (Checks-Effects-Interactions)
            (bool ok, ) = customer.call{value: address(this).balance}("");
            require(ok, "Refund failed");
        }

        Vendor(payable(vendorContract)).notifyFabricFromOrder(
            orderId,
            customerId,
            uint8(VendorFabric.OrderEventType.Cancelled),
            address(this)
        );
    }

    /// Called by Vendor contract during batch deactivation/refund. Only Vendor contract may call.
    /// This cancels and refunds if paid. Uses effect-first ordering.
    function cancelByVendor() external {
        require(msg.sender == vendorContract, "Only vendor contract");
        require(
            status == Status.Created ||
                status == Status.Approved ||
                status == Status.Paid,
            "Cannot cancel"
        );

        bool wasPaid = (status == Status.Paid);
        status = Status.Cancelled;

        if (wasPaid) {
            (bool ok, ) = customer.call{value: address(this).balance}("");
            require(ok, "Refund failed");
        }

        // notify fabric via vendor contract (msg.sender is vendor contract)
        Vendor(payable(vendorContract)).notifyFabricFromOrder(
            orderId,
            customerId,
            uint8(VendorFabric.OrderEventType.Cancelled),
            address(this)
        );
    }
}
