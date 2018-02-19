var CryptoSpinners = artifacts.require("./CryptoSpinners.sol");
const BigNumber = require('bignumber.js');
var utils = require("./utils.js");

var NULL_ACCOUNT = "0x0000000000000000000000000000000000000000";

contract('CryptoSpinners-Base', function(accounts) {

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
    var PURCHASE_COMMON_PRICE;

    before(async function() {
        cspin = await CryptoSpinners.deployed();
        await utils.preMint(cspin, 4, owner, operations);
        await utils.mintAllTiers(cspin, 1, owner, operations);
        await utils.release(cspin, owner);
    });

    it("Can get image hash property", async function() {
        var resp = await cspin.spinners(0);
        var imagehash = resp[0];
        var expected = web3.sha3("imagehash");
        assert.equal(expected, imagehash, "Image hash should be equal to value set when minting");
    });

    it("Can get spinner properties", async function() {
        var props = await cspin.getProperties(0);
        assert.equal(1, props[0], "flux should be 1");
        assert.equal(2, props[1], "inertia should be 2");
        assert.equal(3, props[2], "friction should be 3");
        assert.equal(0, props[3], "tier should be 0");
    });

    it("Can purchase spinners", async function() {
        PURCHASE_COMMON_PRICE = new BigNumber(await cspin.PURCHASE_COMMON_PRICE());
        var PURCHASE_UNCOMMON_PRICE = new BigNumber(await cspin.PURCHASE_UNCOMMON_PRICE());
        var PURCHASE_RARE_PRICE = new BigNumber(await cspin.PURCHASE_RARE_PRICE());
        var PURCHASE_LEGENDARY_PRICE = new BigNumber(await cspin.PURCHASE_LEGENDARY_PRICE());
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        await cspin.purchaseUncommonSpinner({from: accountA, value: PURCHASE_UNCOMMON_PRICE});
        await cspin.purchaseRareSpinner({from: accountA, value: PURCHASE_RARE_PRICE});
        await cspin.purchaseLegendarySpinner({from: accountA, value: PURCHASE_LEGENDARY_PRICE});
    });

    it("Can't purchase spinners when sold out'", async function() {
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        await utils.assertRevert(cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE}));
    });

    it("Can get deed metadata", async function() {
        // TODO
        var metadata = await cspin.deedUri(0);
        assert.equal("https://cryptospinners.io/spinner/metadata/00000.json", metadata, "Deed Metadata");
    });

    it("Can bulk mint", async function() {
        imagehashes = [];
        fluxes = [];
        frictions = [];
        inertias = [];
        tiers = [];
        isGolds = [];
        isReserveds = [];
        for (var i = 0; i < 10; i++) {
            imagehashes[i] = web3.sha3('image'+String(i));
            fluxes[i] = i;
            frictions[i] = i;
            inertias[i] = i;
            tiers[i] = 0;
            isGolds[i] = false;
            isReserveds[i] = false;
        }
        var response = await cspin.bulkMintSpinner(imagehashes, fluxes, frictions, inertias, tiers, isGolds, isReserveds, {from: operations});
        // console.log(response);
    });

    it("Can finish minting", async function() {
        await utils.officialRelease(cspin, owner);
        await cspin.finishMinting({from: operations});
        var minting = await cspin.isStillMinting.call();
        assert(!minting, "Minting should be stopped after call to finishMinting");
    });
});
