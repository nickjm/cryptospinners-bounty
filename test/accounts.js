var CryptoSpinners = artifacts.require("./CryptoSpinners.sol");
const BigNumber = require('bignumber.js');
var utils = require("./utils.js");

var NULL_ACCOUNT = "0x0000000000000000000000000000000000000000";

contract('CryptoSpinners-Accounts', function(accounts) {

    var cspin;
    var contractBalance;
    var spinnerX;
    var spinnerY;
    var spinnerXOwner;
    var spinnerYOwner;
    var PURCHASE_COMMON_PRICE;
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
        await cspin.setTreasurer(treasurer, {from: owner});
        await utils.preMint(cspin, 5, owner, operations);
        await utils.release(cspin, owner);
        PURCHASE_COMMON_PRICE = new BigNumber(await cspin.PURCHASE_COMMON_PRICE());
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        contractBalance = 2 * PURCHASE_COMMON_PRICE;
        var resp = await cspin.deedsOf(accountA);
        spinnerX = Number(resp[0]);
        spinnerY = Number(resp[1]);
        spinnerXOwner = accountA;
        spinnerYOwner = accountA;
    });

    it("Can transfer contract balance", async function() {
        var previousAccountBalance = new BigNumber(await web3.eth.getBalance(treasurer));
        var response = await cspin.transferPartialBalance(treasurer, contractBalance, {from: treasurer});
        await utils.compareBalance(treasurer, response.receipt, previousAccountBalance, contractBalance);
        var newContractBalance = await web3.eth.getBalance(cspin.address);
        assert.equal(0, newContractBalance, "Contract balance should be empty after transfer")
        contractBalance = 0;

    });

    it("Can't transfer contract balance including outstanding payments", async function() {
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        await cspin.offerSpinnerForSale(spinnerX, 1000, {from: spinnerXOwner});
        await cspin.buySpinner(spinnerX, {from: accountC, value: 1000});
        contractBalance += PURCHASE_COMMON_PRICE + (1000 * SALE_FEE);
        await utils.assertRevert(cspin.transferPartialBalance(accountA, contractBalance));
        utils.assertRevert(cspin.transferPartialBalance(treasurer, contractBalance));
    });

    it("Can transfer contract balance exluding outstanding payments", async function() {
        await cspin.transferPartialBalance(treasurer, PURCHASE_COMMON_PRICE, {from: treasurer});
    });

    it("Refunds extra to sender", async function() {
        var price = new BigNumber(PURCHASE_COMMON_PRICE);
        price = price.plus(8000);
        await cspin.purchaseCommonSpinner({from: accountE, value: price});
        var amount = new BigNumber(await cspin.payments.call(accountE));
        var expected = new BigNumber(8000);
        assert.equal(expected.toString(), amount.toString(), 'Pending balance should be equal to extra amount included with purchase');
    });
});
