var CryptoSpinners = artifacts.require("./CryptoSpinners.sol");
var Voting = artifacts.require("./Voting.sol");
const BigNumber = require('bignumber.js');
var utils = require("./utils.js");

var NULL_ACCOUNT = "0x0000000000000000000000000000000000000000";

contract('CryptoSpinners-Voting', function(accounts) {

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

    var PURCHASE_COMMON_PRICE;
    var spinnerId;

    before("", async function() {
        cspin = await CryptoSpinners.deployed();
        voting = await Voting.deployed();
        await voting.setDeedContract(cspin.address);
        await cspin.setOperator(operator, {from: owner});
        await cspin.setVotingContract(voting.address, {from: operator});
        await utils.preMint(cspin, 3, owner, operator);
        await utils.release(cspin, owner);
        var PURCHASE_COMMON_PRICE = new BigNumber(await cspin.PURCHASE_COMMON_PRICE());
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
        await cspin.purchaseCommonSpinner({from: accountA, value: PURCHASE_COMMON_PRICE});
    });

    it("Can create an election", async function() {
        await voting.createElection(0x1);
    });

    it("Can activate voting", async function() {
        await voting.activateVoting(0);
    });

    it("Voting works", async function() {
        var resp1 = await cspin.ownerOf(0);
        var resp2 = await cspin.ownerOf(1);
        var resp3 = await cspin.ownerOf(2);
        // console.log(accounts[0]);
        // console.log(resp1);
        // console.log(resp2);
        // console.log(resp3);
        await voting.castVote(0, 0, 2, {from: accountA}); // Election 0, spinner 0, "for" vote
        await voting.castVote(0, 1, 2, {from: accountA}); // Election 0, spinner 1, "for" vote
        await voting.castVote(0, 2, 1, {from: accountA}); // Election 0, spinner 2, "against" vote
    });

    it("Can finish election", async function() {
        await voting.finishVoting(0);
        await voting.getApprovedElectionAddress(0, true);
    });

    it("Can add moderator from CryptoSpinners contract", async function() {
        await cspin.processElection(0, true);
        var resp = await cspin.energyModerators(0x0);
        console.log(resp);
    });

    it("Can run several elections simultaneously", async function() {
        await voting.createElection(0x2);
        await voting.createElection(0x3);
        await voting.activateVoting(1);
        await voting.activateVoting(2);
        await voting.castVote(1, 0, 2, {from: accountA});
        await voting.castVote(2, 0, 2, {from: accountA});
    });
});
