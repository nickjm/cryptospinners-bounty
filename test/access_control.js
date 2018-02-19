var CryptoSpinners = artifacts.require("./CryptoSpinners.sol");
const BigNumber = require('bignumber.js');
var utils = require("./utils.js");

var NULL_ACCOUNT = "0x0000000000000000000000000000000000000000";

contract('CryptoSpinners-AccessControl', function(accounts) {

    var cspin;
    var owner = accounts[0];
    var operator = accounts[1];
    var treasurer = accounts[2];
    var accountA = accounts[3];
    var accountB = accounts[4];
    var accountC = accounts[5];
    var accountD = accounts[6];
    var accountE = accounts[7];
    var accountF = accounts[8];
    var accountOutsider = accounts[9]; // Never given any cspin ownership

    var allAccountsFailExcept = async function(promise, account) {
        for (var i = 0; i < 10; i++) {
            if (accounts[i] != account) {
                await utils.expectThrow(promise(accounts[i]), true);
            }
        }
        await promise;
    }

    before(async function() {
        cspin = await CryptoSpinners.deployed();
    });

    it("should allow special accounts to be updated", async function() {
        await cspin.setTreasurer(treasurer);
        await cspin.setOperator(operator);
        var actualTreasurer = await cspin.treasurer();
        var actualOperations = await cspin.operator();
        var actualOwner = await cspin.owner();
        assert.equal(actualTreasurer, treasurer, "Treasurer wasn't set properly");
        assert.equal(actualOperations, operator, "Treasurer wasn't set properly");
        assert.equal(actualOwner, owner, "Owner wasn't set properly");
    });

    it("should throw when restricted functions are accessed without clearance", async function() {
        await utils.release(cspin, owner);
        await utils.preMint(cspin, 1, owner, operator);

        // [Treasurer Only] Accounts: Transfer Partial Balance
        await allAccountsFailExcept(async function(addr) {
            return cspin.transferPartialBalance(0x0, 1, {from: addr});
        }, treasurer);

        // [Operations Only, Before Offical Only] Base: Set Seasons
        await allAccountsFailExcept(async function(addr) {
            await cspin.setSeasonsAddress(0x0, true, {from: addr});
        }, operator);

        // [Operations Only, Still Minting] Base: Mint
        await allAccountsFailExcept(async function(addr) {
            await cspin.mintSpinner("imagehash", 2, 2, 2, 0, false, false, {from: addr});
        }, operator);

        // [Owner Only] ReleaseCandidate: Next State
        await allAccountsFailExcept(async function(addr) {
            await cspin.nextState({from: addr});
        }, owner);

        // [Operations Only, Official Relase Only] Base: Finish Minting
        await allAccountsFailExcept(async function(addr) {
            await cspin.finishMinting({from: addr});
        }, operator);
    });
});

contract('CryptoSpinners-AccessControl-Desctruction', function(accounts) {

    var owner = accounts[0];
    var operator = accounts[1];
    var treasurer = accounts[2];
    var accountA = accounts[3];
    var accountB = accounts[4];
    var accountC = accounts[5];
    var accountD = accounts[6];
    var accountE = accounts[7];
    var accountF = accounts[8];
    var accountOutsider = accounts[9]; // Never given any cspin ownership

    var allAccountsFailExcept = async function(promise, account) {
        for (var i = 0; i < 10; i++) {
            if (accounts[i] != account) {
                await utils.expectThrow(promise(accounts[i]), true);
            }
        }
        await promise;
    }

    it('Only owner can self destruct', async function() {
        var cspin = await CryptoSpinners.deployed();
        await allAccountsFailExcept(async function(addr) {
            await cspin.destroy({from: addr});
        }, owner);
    });

});
