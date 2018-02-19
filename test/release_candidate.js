var CryptoSpinners = artifacts.require("./CryptoSpinners.sol");
const BigNumber = require('bignumber.js');
var utils = require("./utils.js");

var NULL_ACCOUNT = "0x0000000000000000000000000000000000000000";

contract('CryptoSpinners-ReleaseCandidate', function(accounts) {

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

    var PURCHASE_COMMON_PRICE;
    var PURCHASE_UNCOMMON_PRICE;
    var PURCHASE_RARE_PRICE;
    var PURCHASE_LEGENDARY_PRICE;
    var spinnerId;

    before("", async function() {
        cspin = await CryptoSpinners.deployed();
        await utils.mintAllTiers(cspin, 5, owner, operations);
        PURCHASE_COMMON_PRICE = new BigNumber(await cspin.PURCHASE_COMMON_PRICE());
        PURCHASE_UNCOMMON_PRICE = new BigNumber(await cspin.PURCHASE_UNCOMMON_PRICE());
        PURCHASE_RARE_PRICE = new BigNumber(await cspin.PURCHASE_RARE_PRICE());
        PURCHASE_LEGENDARY_PRICE = new BigNumber(await cspin.PURCHASE_LEGENDARY_PRICE());
    });

    it("Nothing but minting and access control can happen in deployed state", async function() {
        spinnerId = 0;
        await utils.assertRevert(cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE}));
        await utils.assertRevert(cspin.PURCHASE_UNCOMMON_PRICE({from: accountA, value: PURCHASE_UNCOMMON_PRICE}));
        await utils.assertRevert(cspin.purchaseRareSpinner({from: accountA, value: PURCHASE_RARE_PRICE}));
        await utils.assertRevert(cspin.purchaseLegendarySpinner({from: accountA, value: PURCHASE_LEGENDARY_PRICE}));
        await cspin.setTreasurer(treasurer);
        await cspin.setOperator(operations);
    });

    it("Appropriate functions in beta state", async function() {
        await utils.release(cspin, owner);
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        var resp = await cspin.deedsOf(accountA);
        spinnerId = Number(resp[0]);
        await cspin.offerSpinnerForSale(spinnerId, 1000, {from: accountA});
        await cspin.spinnerNoLongerForSale(spinnerId, {from: accountA});
        await cspin.offerSpinnerForSaleToAddress(spinnerId, 1000, accountB, {from: accountA});
        await cspin.buySpinner(spinnerId, {from: accountB, value: 1000});
        await cspin.enterBidForSpinner(spinnerId, {from: accountA, value: 2000});
        await cspin.acceptBidForSpinner(spinnerId, 2000, {from: accountB});
        await cspin.enterBidForSpinner(spinnerId, {from: accountC, value: 2000});
        await cspin.withdrawBidForSpinner(spinnerId, {from: accountC});
        await cspin.transfer(accountB, spinnerId, {from: accountA});
        await cspin.approve(accountA, spinnerId, {from: accountB});
        await cspin.takeOwnership(spinnerId, {from: accountA});
        await cspin.purchaseUncommonSpinner({from: accountA, value: PURCHASE_UNCOMMON_PRICE});
        await cspin.purchaseRareSpinner({from: accountA, value: PURCHASE_RARE_PRICE});
        await cspin.purchaseLegendarySpinner({from: accountA, value: PURCHASE_LEGENDARY_PRICE});
        await cspin.setSeasonsAddress(0x0, true, {from: operations});
    });

    it("Appropriate functions in official release state", async function() {
        await utils.officialRelease(cspin, owner);
        await utils.assertRevert(cspin.setSeasonsAddress(0x0, true, {from: operations}));
        // await utils.assertRevert(cspin.destroy({from: owner})); TODO reinstate before mainnet launch
        await cspin.finishMinting({from: operations});
    });
});
