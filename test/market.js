var CryptoSpinners = artifacts.require("./CryptoSpinners.sol");
var utils = require("./utils.js");
const BigNumber = require('bignumber.js');
var NULL_ACCOUNT = "0x0000000000000000000000000000000000000000";

contract('CryptoSpinners-Market', function(accounts) {
    var cspin;
    var spinnerX;
    var spinnerY;
    var spinnerXOwner;
    var spinnerYOwner;
    var owner = accounts[0];
    var operations = accounts[1];
    var treasurer = accounts[2];
    var accountA = accounts[3];
    var accountB = accounts[4];
    var accountC = accounts[5];
    var accountD = accounts[6];
    var accountE = accounts[7];
    var accountF = accounts[8];
    var accountOutsider = accounts[9]; // Never given any cspin ownership

    var SALE_FEE = 0.03;

    before(async function() {
        cspin = await CryptoSpinners.deployed();
        await utils.preMint(cspin, 5, owner, operations);
        await utils.release(cspin, owner);
        var PURCHASE_COMMON_PRICE = new BigNumber(await cspin.PURCHASE_COMMON_PRICE());
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        var resp = await cspin.deedsOf(accountA);
        spinnerX = Number(resp[0]);
        spinnerY = Number(resp[1]);
        spinnerXOwner = accountA;
        spinnerYOwner = accountA;
    });

    describe('Bidding Unit Tests', function() {

        it("Can't bid on own spinner", async function() {
            await utils.assertRevert(cspin.enterBidForSpinner(spinnerX, {from: spinnerXOwner, value: 1000}));
        });

        it("Can't bid with zero value", async function() {
            await utils.assertRevert(cspin.enterBidForSpinner(spinnerX, {from: accountB, value: 0}));
        });

        it("Can bid", async function() {
            var bidValue = 1000;
            var previousBalance = new BigNumber(await web3.eth.getBalance(accountB));
            var response = await cspin.enterBidForSpinner(spinnerX, {from: accountB, value: bidValue});
            await utils.compareBalance(accountB, response.receipt, previousBalance, -bidValue);
        });

    });

    describe("Post Bid Unit Tests", function () {

        it("Can't cancel from non-bidder address", async function() {
            await utils.assertRevert(cspin.withdrawBidForSpinner(spinnerX, {from: accountC}));
        });

        it("Can bid underneath an existing bid", async function() {
            await utils.assertRevert(cspin.enterBidForSpinner(spinnerX, {from: accountD, value: 999}));
        });

        it("Can't accept bid unless owner", async function() {
            await utils.assertRevert(cspin.acceptBidForSpinner(spinnerX, 1001, {from: accountE}));
        });

        it("Can outbid", async function() {
            cspin.enterBidForSpinner(spinnerX, {from: accountD, value: 1001})
            var amount = await cspin.payments.call(accountB);
            assert.equal(1000, amount, 'Pending balance should be equal to previous bid after outbid');
        });

        it("Can cancel bid", async function() {
            var previousBalance = new BigNumber(await web3.eth.getBalance(accountD));
            var response = await cspin.withdrawBidForSpinner(spinnerX, {from: accountD});
            await utils.compareBalance(accountD, response.receipt, previousBalance, 0);
            var amount = await cspin.payments.call(accountD);
            assert.equal(1001, amount, 'Pending balance should be equal to previous bid');
        });

        it("Can bid again after pending bid cancel", async function() {
            var bidValue = 1000;
            var previousBalance = new BigNumber(await web3.eth.getBalance(accountB));
            var response = await cspin.enterBidForSpinner(spinnerX, {from: accountB, value: bidValue});
            await utils.compareBalance(accountB, response.receipt, previousBalance, -bidValue);
        });

    });

    describe("Accept Bid Tests", function () {

        it("Can't accept bid for a spinner that has no bid", async function() {
            await utils.assertRevert(cspin.acceptBidForSpinner(spinnerY, 100, {from: accountA}));
        });

        it("Can't accept bid for a spinner with too high an accept value", async function() {
            await utils.assertRevert(cspin.acceptBidForSpinner(spinnerX, 50000, {from: accountA}));
        });

        it("Can accept bid", async function() {
            var bid = await cspin.spinnerBids(spinnerX);
            var bidValue = bid[2];
            var bidder = bid[0];
            await cspin.acceptBidForSpinner(spinnerX, bidValue, {from: spinnerXOwner});
            var amount = await cspin.payments.call(accountA);
            var expected = bidValue - Math.floor(bidValue * SALE_FEE); // 3% Sale Fee
            assert.equal(expected, amount, 'Pending balance should be equal to previous bid');
            var newOwner = await cspin.ownerOf(spinnerX);
            assert.equal(bidder, newOwner, 'After accepting the bid, new owner should be the bidder of accepted bid');
            spinnerXOwner = newOwner;
        });

    });

    describe("Offer Tests", function() {

        it("Can't buy a spinner that is not for sale", async function() {
            await utils.assertRevert(cspin.buySpinner(spinnerY, {from: accountD, value: 9000}));
        });

        it("Can't buy a spinner with an invalid index", async function() {
            await utils.assertRevert(cspin.buySpinner(12, {from: accountD, value: 3000}));
        });

        it("Can offer for sale", async function() {
            await cspin.offerSpinnerForSale(spinnerY, 3000, {from: spinnerYOwner});
            var offer = await cspin.spinnerAsks(spinnerY);
            assert.equal(spinnerYOwner, offer[0], "spinner should be for sale by owner");
            assert.equal(NULL_ACCOUNT, offer[1], "spinner should not be for sale to anyone");
            assert.equal(spinnerY, offer[2], "spinnerY should be for sale");
            assert.equal(3000, offer[3], "spinner should be for sale at 9000");
            assert.equal(true, offer[4], "Spinner 0 for sale");
        });

        it("Can't buy a spinner for too little money", async function() {
            await utils.assertRevert(cspin.buySpinner(spinnerY, {from: accountD, value: 2000}));
        });

        it("Can buy a spinner that is for sale", async function() {
            var previousPending = new BigNumber(await cspin.payments.call(spinnerYOwner));
            var ask = await cspin.spinnerAsks(spinnerY);
            var askValue = new BigNumber(ask[3]);
            var response = await cspin.buySpinner(spinnerY, {from: accountD, value: askValue});
            var amount = await cspin.payments.call(spinnerYOwner);
            var expected = previousPending.plus(askValue).minus(Math.floor(askValue * SALE_FEE)); // 3% Sale Fee
            assert.equal(expected.toString(), amount.toString(), 'Pending balance should be equal to previous bid');
            var owner = await cspin.ownerOf(spinnerY);
            assert.equal(accountD, owner, 'owner should be account d after purchase');
            spinnerYOwner = owner;
        });

        it("Can offer for sale then withdraw", async function() {
            await cspin.offerSpinnerForSale(spinnerY, 2000, {from: spinnerYOwner});
            await cspin.spinnerNoLongerForSale(spinnerY, {from: spinnerYOwner});
            var ask = await cspin.spinnerAsks(spinnerY);
            assert.equal(false, ask[4], "Spinner Y not for sale");
        });

        it("Non-seller can't withdraw offer", async function() {
            await cspin.offerSpinnerForSale(spinnerY, 2000, {from: spinnerYOwner});
            await utils.assertRevert(cspin.spinnerNoLongerForSale(spinnerY, {from: accountA}));
            var ask = await cspin.spinnerAsks.call(spinnerY);
            assert.equal(true, ask[4], "Spinner Y still for sale");
        });

        it("Can offer for sale to specific account", async function() {
            await cspin.spinnerNoLongerForSale(spinnerY, {from: spinnerYOwner});
            await cspin.offerSpinnerForSaleToAddress(spinnerY, 2000, accountA, {from: spinnerYOwner});
        });

        it("Only approved buyer can accept offer", async function() {
            var ask = await cspin.spinnerAsks(spinnerY);
            var askValue = new BigNumber(ask[3]);
            await utils.assertRevert(cspin.buySpinner(spinnerY, {from: accountB, value: askValue}));
            await cspin.buySpinner(spinnerY, {from: accountA, value: askValue});
            spinnerYOwner = accountA;
        });

        it("Transfer should cancel offers", async function() {
            await cspin.offerSpinnerForSale(spinnerY, 1000, {from: spinnerYOwner});
            await cspin.transfer(accountB, spinnerY, {from: spinnerYOwner});
            spinnerYOwner = accountB;
            var ask = await cspin.spinnerAsks(spinnerY);
            assert.equal(false, ask[4], "Spinner Y not for sale");
        });

        it("Can offer up a spinner for sale, then get a lower bid, accept that bid", async function() {
            var previousPending = new BigNumber(await cspin.payments.call(spinnerYOwner));
            var askValue = 100000;
            var bidValue = askValue - 10000;
            await cspin.offerSpinnerForSale(spinnerY, askValue, {from: spinnerYOwner});
            await cspin.enterBidForSpinner(spinnerY, {from: accountF, value: bidValue});
            await cspin.acceptBidForSpinner(spinnerY, bidValue, {from: spinnerYOwner});
            var amount = await cspin.payments.call(spinnerYOwner);
            var expected = previousPending.plus(bidValue).minus(Math.floor(bidValue * SALE_FEE)); // 3% Sale Fee
            assert.equal(expected.toString(), amount.toString(), 'Pending balance should be equal to accepted bid');
        });

    });

});
