var CryptoSpinners = artifacts.require("./CryptoSpinners.sol");

var utils = require("./utils.js");

var NULL_ACCOUNT = "0x0000000000000000000000000000000000000000";

contract('CryptoSpinners-NFT', function(accounts) {

    var owner = accounts[0];
    var operations = accounts[1];
    var treasurer = accounts[2];
    var acct_x = accounts[3];
    var acct_y = accounts[4];
    var acct_z = accounts[5];

    it("...should return correct data for name, symbol, metadata.", async function() {
        var cspin = await CryptoSpinners.deployed();
        var name = await cspin.name();
        var symbol = await cspin.symbol();
        var decimals = await cspin.decimals();
        assert.equal(name, 'CryptoSpinners', "Name wasn't set properly");
        assert.equal(symbol, 'CSPIN', "Symbol wasn't set properly");
        assert.equal(decimals, 0, "Decimals was more than zero");
        // TODO metadata check
    });

    it("...minting should increase countOfDeeds.", async function() {
        var cspin = await CryptoSpinners.deployed();
        await cspin.setOperator(operations, {from: owner});
        await utils.preMint(cspin, 3, owner, operations);
        var supply = await cspin.countOfDeeds();
        assert.equal(supply, 3, "total supply = 3 after minting two spinners.");
    });

    it("...basic ownership", async function() {
        var cspin = await CryptoSpinners.deployed();
        await utils.release(cspin, owner);

        // Purchase a spinner => ownerOf and countOfDeedsByOwner updated accordingly
        await cspin.purchaseCommonSpinner({from: acct_x, value: 2000000000000000});
        var ownerPresent = false;
        for (var i = 0; i < await cspin.countOfDeeds(); i++) {
            if (await cspin.ownerOf(i) == acct_x) {
                ownerPresent = true;
            }
        }
        assert.equal(ownerPresent, true, "purchaser should be owner of one of spinners");
        await cspin.purchaseCommonSpinner({from: acct_x, value: 2000000000000000});

        var balance = await cspin.countOfDeedsByOwner(acct_x);
        assert.equal(balance, 2, "balance should be two after two puchases");

        // Invalid Id => Throw
        await utils.expectThrow(cspin.ownerOf(3), true);
        await utils.expectThrow(cspin.ownerOf(4), true);
        await utils.expectThrow(cspin.ownerOf(20000), true);

        // Tokens of owner => Correct IDs and Quantity
        var tokensX = await cspin.deedsOf(acct_x);
        assert.equal(tokensX.length, 2, "Account X should own two tokens"); // TODO maybe check exact contents
        // assert.equal(tokensX[0]['c'])

        // Tokens of non owner => Empty
        var tokensY = await cspin.deedsOf(acct_y);
        assert.equal(tokensY.length, 0, "Account Y shouldn't own any tokens");

        // Nth token of owner => Valid ID owned by address
        // var tokenX = await cspin.deedsOf(acct_x)[1];
        //TODO fix
        //await utils.expectThrow(cspin.tokenOfOwnerByIndex(acct_x, 2), true);
    });

    it("...basic transfers", async function() {
        var cspin = await CryptoSpinners.deployed();

        // Purchase a spinner => Transfer Event fired
        var resp = await cspin.purchaseCommonSpinner({from: acct_y, value: 2000000000000000});
        var resp2 = await cspin.deedsOf(acct_y);
        var newId = resp2[0]['c'][0];
        utils.assertTransferEvent(resp, cspin.address, acct_y, newId, 1);

        // Non Owner transfers a spinner => Throw
        await utils.expectThrow(cspin.transfer(acct_y, 0, {from: acct_z}), true);

        // Anyone transfers an invalid spinner => Throw
        await utils.expectThrow(cspin.transfer(acct_z, 100, {from: acct_y}), true);

        // Direct transfer to 0x0 => Throw
        await utils.expectThrow(cspin.transfer(NULL_ACCOUNT, newId, {from: acct_y}), true);

        // Direct transfer to self => Ownership maintained, Transfer Event fired
        // TODO add test back depending on what happens to standard
        // resp = await cspin.transfer(acct_y, newId, {from: acct_y});
        // utils.assertTransferEvent(resp, acct_y, acct_y, newId, 1);
        // var sameOwner = await cspin.ownerOf(newId);
        // assert.equal(sameOwner, acct_y, 'New Owner should be transfer recipient, Y');

        // Direct transfer to new address => Ownership updated, Transfer Event fired
        resp = await cspin.transfer(acct_z, newId, {from: acct_y});
        utils.assertTransferEvent(resp, acct_y, acct_z, newId, 1);
        var newOwner = await cspin.ownerOf(newId);
        assert.equal(newOwner, acct_z, 'New Owner should be transfer recipient, Y');
    });

    it("...approval state", async function() {
        var cspin = await CryptoSpinners.deployed();
        var resp = await cspin.deedsOf(acct_z);
        var newId = resp[0]['c'][0];
        // Non Owner approves spinner => Throw
        await utils.expectThrow(cspin.approve(acct_x, newId, {from: acct_y}), true);

        // Anyone approves invalid spinner => Throw
        await utils.expectThrow(cspin.approve(acct_x, 100, {from: acct_z}), true);

        // Owner approves self => Throw
        await utils.expectThrow(cspin.approve(acct_z, newId, {from: acct_z}), true);

        // Prior State: Clear, Approve 0x0 => Clear, No Event
        await cspin.approve(NULL_ACCOUNT, newId, {from: acct_z});
        var clearApproval = await cspin.approvedFor(newId);
        assert.equal(clearApproval, NULL_ACCOUNT, 'Approval should be clear after approving 0x0.');

        // Prior State: Clear, Approve X => X approved, Event fired
        resp = await cspin.approve(acct_x, newId, {from: acct_z});
        utils.assertApprovalEvent(resp, acct_z, acct_x, newId, 0);
        var xApproval = await cspin.approvedFor(newId);
        assert.equal(xApproval, acct_x, 'Approval should be set to x after approving x.');

        // Prior State: X, Approve Y => Y approved, Event fired
        resp = await cspin.approve(acct_y, newId, {from: acct_z});
        utils.assertApprovalEvent(resp, acct_z, acct_y, newId, 0);
        var yApproval = await cspin.approvedFor(newId);
        assert.equal(yApproval, acct_y, 'Approval should be set to y after approving y (previously x).');

        // Prior State: Y, Approve Y => Y still approved, Event fired
        resp = await cspin.approve(acct_y, newId, {from: acct_z});
        utils.assertApprovalEvent(resp, acct_z, acct_y, newId, 0);
        var yApproval = await cspin.approvedFor(newId);
        assert.equal(yApproval, acct_y, 'Approval should be set to y after reapproving y.');

        // Prior State: Y, Approve 0x0 => Clear, Event fired
        resp = await cspin.approve(NULL_ACCOUNT, newId, {from: acct_z});
        utils.assertApprovalEvent(resp, acct_z, 0x0, newId, 0);
        var clearApproval = await cspin.approvedFor(newId);
        assert.equal(clearApproval, NULL_ACCOUNT, 'Approval should be clear after approving 0x0.');
    });

    it("...clear pending approvals after transfers", async function() {
        var cspin = await CryptoSpinners.deployed();
        var resp = await cspin.deedsOf(acct_z);
        var spinnerId = resp[0]['c'][0];

        // A Owns. Prior State: Clear, Transfer to X => Clear, Events: Transfer
        resp = await cspin.transfer(acct_x, spinnerId, {from: acct_z});
        utils.assertTransferEvent(resp, acct_z, acct_x, spinnerId, 1);
        var currentOwner = await cspin.ownerOf(spinnerId);
        assert.equal(currentOwner, acct_x, 'new owner should be X after transfer');
        var clearApproval = await cspin.approvedFor(spinnerId);
        assert.equal(clearApproval, 0x0, 'approval should be cleared after transfer');

        // X Owns. Prior State: Y, Transfer to Z => Clear, Events: Transfer, Approve
        resp = await cspin.approve(acct_y, spinnerId, {from: acct_x});
        utils.assertApprovalEvent(resp, acct_x, acct_y, spinnerId, 0);
        resp = await cspin.transfer(acct_z, spinnerId, {from: acct_x});
        // console.log(resp);
        utils.assertApprovalEvent(resp, acct_x, 0x0, spinnerId, 0);
        utils.assertTransferEvent(resp, acct_x, acct_z, spinnerId, 1);
        var clearApproval = await cspin.approvedFor(spinnerId);
        assert.equal(clearApproval, 0x0, 'approval should be cleared after transfer');

        // Z Owns. Prior State: Y, Transfer to Z (no-op) => Clear, Events: Transfer, Approve
        // TODO add again if self transfer is part of standard
        // resp = await cspin.approve(acct_y, spinnerId, {from: acct_z});
        // utils.assertApprovalEvent(resp, acct_z, acct_y, spinnerId, 0);
        // resp = await cspin.transfer(acct_z, spinnerId, {from: acct_z});
        // utils.assertApprovalEvent(resp, acct_z, 0x0, spinnerId, 0);
        // utils.assertTransferEvent(resp, acct_z, acct_z, spinnerId, 1);
        // var clearApproval = await cspin.approvedFor(spinnerId);
        // assert.equal(clearApproval, 0x0, 'approval should be cleared after transfer');

        // Z Owns. Prior State: Y, Transfer to Y => Clear, Events: Transfer, Approve
        resp = await cspin.approve(acct_y, spinnerId, {from: acct_z});
        utils.assertApprovalEvent(resp, acct_z, acct_y, spinnerId, 0);
        resp = await cspin.transfer(acct_y, spinnerId, {from: acct_z});
        utils.assertApprovalEvent(resp, acct_z, 0x0, spinnerId, 0);
        utils.assertTransferEvent(resp, acct_z, acct_y, spinnerId, 1);
        var clearApproval = await cspin.approvedFor(spinnerId);
        assert.equal(clearApproval, 0x0, 'approval should be cleared after transfer');

    });

    it("...approval, takeOwnership", async function() {
        var cspin = await CryptoSpinners.deployed();
        var resp = await cspin.deedsOf(acct_y);
        var spinnerId = resp[0]['c'][0];

        // Take invalid spinner => Throw
        await utils.expectThrow(cspin.takeOwnership(100, {from: acct_y}), true);

        // Take already owned spinner => Throw
        await utils.expectThrow(cspin.approve(acct_y, spinnerId, {from: acct_y}), true);
        await utils.expectThrow(cspin.takeOwnership(spinnerId, {from: acct_y}), true);

        // Y Owns. Prior State: Clear, Take from X => Throw
        await utils.expectThrow(cspin.takeOwnership(spinnerId, {from: acct_x}), true);

        // Y Owns. Prior State: X, Take from X => Clear, Events: Transfer, Approve
        resp = await cspin.approve(acct_x, spinnerId, {from: acct_y});
        utils.assertApprovalEvent(resp, acct_y, acct_x, spinnerId, 0);
        resp = await cspin.takeOwnership(spinnerId, {from: acct_x});
        utils.assertApprovalEvent(resp, acct_y, 0x0, spinnerId, 0);
        utils.assertTransferEvent(resp, acct_y, acct_x, spinnerId, 1);
        var clearApproval = await cspin.approvedFor(spinnerId);
        assert.equal(clearApproval, 0x0, 'approval should be cleared after transfer');
        var newOwner = await cspin.ownerOf(spinnerId);
        assert.equal(newOwner, acct_x, 'new owner should be x who just took ownership.');

        // X Owns. Prior State: Y, Take from Z => Throw
        await cspin.approve(acct_y, spinnerId, {from: acct_x});
        await utils.expectThrow(cspin.takeOwnership(spinnerId, {from: acct_z}), true);
    });

});
