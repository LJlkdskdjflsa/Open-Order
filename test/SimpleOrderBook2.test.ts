import {expect} from "chai";
import {ethers} from "hardhat";
import {Contract, Event, Signer} from "ethers";

async function waitForEvent(contract: Contract, eventName: string, filter: any = {}) {
	return new Promise((resolve, reject) => {
		contract.once({event: eventName, ...filter}, (event: any) => {
			resolve(event);
		});
	});
}

describe("SimpleOrderBook", function () {
	let simpleOrderBook: Contract;
	let user1: Signer;
	let user2: Signer;
	let sellToken: Contract;
	let buyToken: Contract;
	let sellTokenAddress: string;
	let buyTokenAddress: string;

	beforeEach(async () => {
		// Deploy the SimpleOrderBook contract
		const SimpleOrderBook = await ethers.getContractFactory("SimpleOrderBook");
		simpleOrderBook = await SimpleOrderBook.deploy();
		await simpleOrderBook.deployed();

		// Get users
		[user1, user2] = await ethers.getSigners();

		// Deploy sample ERC20 tokens
		const ERC20 = await ethers.getContractFactory("ERC20Mock");
		sellToken = await ERC20.deploy("Sell Token", "STK");
		buyToken = await ERC20.deploy("Buy Token", "BTK");

		await sellToken.deployed();
		await buyToken.deployed();

		sellTokenAddress = sellToken.address;
		buyTokenAddress = buyToken.address;

		// Mint tokens to users
		await sellToken.mint(await user1.getAddress(), ethers.utils.parseEther("1000"));
		await buyToken.mint(await user2.getAddress(), ethers.utils.parseEther("1000"));
	});

	it("should allow user to take an order", async () => {
		const sellTokenAmount = ethers.utils.parseEther("100");
		const buyTokenAmount = ethers.utils.parseEther("200");

		// Approve the SimpleOrderBook contract to spend user1's sellToken
		await sellToken.connect(user1).approve(simpleOrderBook.address, sellTokenAmount);

		// Listen for the OrderPlaced event
		const orderPlacedPromise = waitForEvent(simpleOrderBook, "OrderPlaced");

		// Call placeOrder function
		await simpleOrderBook.connect(user1).placeOrder(
			sellTokenAddress,
			buyTokenAddress,
			sellTokenAmount,
			buyTokenAmount
		);

		// Wait for the OrderPlaced event to be emitted
		const orderPlacedEvent = (await orderPlacedPromise) as Event;


		// Get the orderId from the OrderPlaced event
		const orderId = orderPlacedEvent.args?.id;
		console.log("orderId", orderId);


		// Approve the SimpleOrderBook contract to spend user2's buyToken
		await buyToken.connect(user2).approve(simpleOrderBook.address, buyTokenAmount);

		// Call takeOrder function
		await simpleOrderBook.connect(user2).takeOrder(orderId);

		// Check balances after taking the order
		const user1SellTokenBalance = await sellToken.balanceOf(await user1.getAddress());
		const user1BuyTokenBalance = await buyToken.balanceOf(await user1.getAddress());
		const user2SellTokenBalance = await sellToken.balanceOf(await user2.getAddress());
		const user2BuyTokenBalance = await buyToken.balanceOf(await user2.getAddress());

		expect(user1SellTokenBalance).to.equal(ethers.utils.parseEther("900"));
		expect(user1BuyTokenBalance).to.equal(ethers.utils.parseEther("200"));
		expect(user2BuyTokenBalance).to.equal(ethers.utils.parseEther("800"));

		// Check the order status in the contract
		const order = await simpleOrderBook.orders(orderId);
		expect(order.finished).to.equal(true);
	});
});
