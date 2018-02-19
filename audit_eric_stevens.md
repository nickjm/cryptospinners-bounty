Eric Stevens, Cryptospinners code review. February 11th, 2018.
The review is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. in no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the review or the use or other dealings in the review.

Code version: `master` branch, commit `9231a8e`.

****************************************

`test/`
* Suggest using `babel-register` (injected in `truffle.js`) to utilize ES6 imports and syntax for unit tests.

`test/utils.js`
* Lots of functionality here can be derived from zeppelin-solidity instead. Once babel is properly injected, their helper unit tests can be directly imported and used.

`contracts/ERC721/ERC721Deed.sol`

**Note:** I haven't used the ERC721 spec extensively yet, so some of the stuff I comment on may be part of the spec and out of your control.

* Any reasoning for `totalDeeds` and `totalOwners` to be private? I don't see any reason for that to be sensitive data, and leaving it private only makes things more difficult for you if you should ever need to access it. *Nick: we follow the OZ implementation and use the public functions with names specified by ERC721... although I agree with you*
* `notOwnerOf` has a bug - `require` condition should be `!=` instead of `==`. Modifier isn't used anywhere, maybe best if it's deleted entirely. *Nick: deleted the modifier*
* `deedUri` involves a lot of magic numbers and is very cryptic. Could benefit from some clarification comments / documentation. *Nick: waiting to update until location of assets is finalized*
* `deedsOf` function is extraneous, when `ownedDeeds` could just be made public, instead. *Nick: yeah I agree. For now, leaving like OZ had it, but might do this*
* Similar follows for `countOfDeeds`. In general, it should be preferred that the Solidity code implements as small of a footprint as possible - anything that could be derived through `web3` calls should be done on the Javascript side to save on EVM costs. `countOfDeedsByOwner` is a good example - it'd be trivial to simply return the array and do the count in JS land. Since JS code is mutable and doesn't cost per byte you write into the blockchain, it's worth offloading as much work onto that side of things as possible. *Nick: removed the latter because we're no longer implementing ERC721Enumerable, keeping the former to follow the latest ERC721 spec*
* Line 162: `approve`, `if (approvedFor(_deedId) != 0 || _to != 0)` - It's good to be specific about your types in comparisons like this. I assume you actually mean `_to != address(0x)`. *Nick: fixed. not sure why OZ did this...*
* Same function, is there a reason why you opt to silently fail on the above condition, but opt to `require(_to != owner)`? Try to stick to one error handling technique unless there's a good reason not to (i.e. some other function relies on the silent failing behaviour). In general, silent failure is bad, anyways. *Side node: you shadow the `owner` variable here. Zeppelin's `Ownable` implmentation uses `owner` as its variable - it'd be good not to get in the habit of shadowing it.* *Nick: Agreed, not sure why OZ did this... Fixed.*
* `deedByIndex` is a little cryptic. Maybe outline an example of what the layout of deed IDs are to be more clear. *Nick: the ids are determined simply by minting order and id == index*

`contracts/AccessControl.sol`
* It's nice to fire events in `setTreasurer` and `setOperator`. Makes it dead easy to build audit logs. *Nick: done*

`contracts/CryptoSpinnersBase.sol`
* I notice a lot of usage of small sized integers (i.e. `uint8`, etc). The EVM is a 256-bit based stack machine, so unless you're doing clever packing (such as 4 `uint64`s beside eachother), I don't think there's a material benefit to be had from using smaller sized integers. I would recommend using `uint` or `uint256` unless there's convincing reason otherwise - there's no downside. *Nick: yes in general I should have just used uint. I think the Spinner struct and maybe a few others do take advantage of packing though*
* Line 162, `getProperties`, `storage` is the correct keyword here. You're making a reference to something that was allocated to `storage`. This function is extraneous because you can just call `spinners(_spinnerId)` and have equivalent functionality. *Nick: Refactored function to return 4 named params. Might remove this function, but I think
it might make the battle function is seasons use a tad less gas which is important*
* Is there a reason to implement both `mintSpinner` and `_mintSpinner`? Looks like it could easily be compressed down into one function. *Nick: there is both a `mintSpinner` and `bulkMintSpinner` as of now, but might condense to just the bulk version because the contract is almost too big*
* What's the reason to limit spinner ID to `65535`? Arrays in Solidity can be addressable up to `2^256 - 1`. *Nick: not necessary but we're only ever going to have 20,000*
* The way `ERC721Deed` is used both like an inherited parent _and_ as a component instead of just one or the other is a little scary. I'd recommend either standardizing on a strictly inherited structure, or compartmentalize a little bit more and commit to using `ERC721Deed` strictly as a component, instead. *Nick: would like to discuss more.*
* Be super careful you quadruple check the behaviour of `purchaseExactSpinner`. Unbounded loops like that are liable to cost astronomical amounts of gas, or even excess the gas limit of the block. *Nick: function removed entirely*
* In my opinion, I'm not convinced there's a good implementation of PRNG that can happen solely on chain. I hope you've thought through carefully what implications your `_random` has - I know you have a note that recognizes its insecure, but really think about what the worst-case consequences are. *Nick: I think this is fine. Purchasing is only relevant until we sell out of 20,000 spinners which should happen in a relatively short amount of time, and based on the initial
sale prices of the spinners it's not a risk in my opinion*
* I note your prices for spinners are fixed ETH amounts that aren't changable. Might want to revisit this to account for fluctuations in ETH price - maybe a function to set a price, that's constrained within a min / max bound defined in the contract? *Nick: prices only relevant for short amount of time, so it's unlikely ETH price fluctuations will matter*

`contracts/CryptoSpinnersMarket.sol`
* `buySpinner`, remember to use `SafeMath` (calculation of `award`). *Nick: done*

`contracts/CryptoSpinnersSeasons.sol`
* A little iffy on the re-implementation of modifiers here. I can see why, but maybe think about if there's a better way. *Nick: as a software engineer I completely agree. Not sure best way to do this in solidity though, given the specific setup here*
* `finishSeason` is a really complicated function. Consider extracting out some of the functionality into smaller pieces to make it less unwieldly and easier to test. *Nick: the refactor does that to some extent. Might break it up further.*
* I'm finding some of the logic in here hard to follow - maybe it's just because I'm not familiar with the battle system from a user perspective. *Nick: Yes it is a bit terse and opaque... I'll add more comments, and share our new info graphic with you :)*

### Closing remarks
* I'm pretty impressed. The implementation seems straightforward and solid. Coding style is consistent and clean, I didn't notice anything that was a serious red flag.
* I mostly focused on style, design decisions, and overall architecture. I'm assuming your unit tests verify that it actually behaves as claimed.
