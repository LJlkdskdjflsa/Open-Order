// GPL license v3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SimpleOrderBook {
	using Counters for Counters.Counter;

	struct Order {
		bytes32 id;
		address sellTokenAddress;
		address buyTokenAddress;
		uint256 sellTokenAmount;
		uint256 buyTokenAmount;
		address owner;
		bool finished;
	}

	Counters.Counter private _orderIds;
	mapping(bytes32 => Order) public orders;

	event OrderPlaced(bytes32 indexed id, address indexed owner);

	function placeOrder(
		address sellTokenAddress,
		address buyTokenAddress,
		uint256 sellTokenAmount,
		uint256 buyTokenAmount
	) external {
		bytes32 id = keccak256(abi.encodePacked(_orderIds.current(), msg.sender, block.timestamp));

		// Transfer sellTokenAmount from owner to contract
		IERC20(sellTokenAddress).transferFrom(msg.sender, address(this), sellTokenAmount);

		orders[id] = Order({
		id : id,
		sellTokenAddress : sellTokenAddress,
		buyTokenAddress : buyTokenAddress,
		sellTokenAmount : sellTokenAmount,
		buyTokenAmount : buyTokenAmount,
		owner : msg.sender,
		finished : false
		});

		_orderIds.increment();

		emit OrderPlaced(id, msg.sender);
	}

	function takeOrder(bytes32 id) external {
		Order storage order = orders[id];

		require(!order.finished, "Order is already finished");

		// Transfer sellTokenAmount from owner to taker
		IERC20(order.sellTokenAddress).transfer(msg.sender, order.sellTokenAmount);
		order.finished = true;
		// Transfer buyTokenAmount from taker to owner
		IERC20(order.buyTokenAddress).transferFrom(msg.sender, order.owner, order.buyTokenAmount);
	}
}
