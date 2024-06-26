// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import {ISupport} from "../interfaces/ISupport.sol";

import {ICBPAddressesProvider} from "../interfaces/ICBPAddressesProvider.sol";

import {StorageExt} from "./StorageExt.sol";
import {Errors} from "../libraries/helpers/Errors.sol";

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC721ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

/**
 * @title Support contract
 * @dev Main point of interaction with the support protocol -
 * - Users can:
 *   # support
 *   # get support list
 * - To be covered by a proxy contract, owned by the CBPAddressesProvider? of the specific market
 * - ?All admin functions are callable by the admin defined also in the CBPAddressesProvider
 * @author CBP
 **/

// !!! For Upgradable: DO NOT ADJUST Inheritance Order !!!
contract Support is Initializable, ISupport, ContextUpgradeable, StorageExt {
  uint256 public constant AssetTypeLimit = 20;
  uint256 public constant SlotLowerLimit = 1;
  uint256 public constant DefaultSlotUpperLimit = 30;
  uint256 public _slotUpperLimit = DefaultSlotUpperLimit;

  struct Balance {
    // Key is SupportAssetType
    mapping(uint256 => uint256) assetMap;
  }

  /*
  struct LongTermSupportTx{
    address supporter;
    uint256 supportedTimeStamp;
    SupportAssetType assetType;
    uint256 assetAmount;
  }
  */

  struct SupportSlot {
    address beneficiary;
    bool claimed;
    Balance balance;
  }

  struct IssueSupport {
    mapping(uint256 => SupportSlot) slots;
  }

  //IssueData of one theme; active IssueNo start from 1
  // current IssueNo = baseIssueNo + (block.timestamp - baseStartTime)/issueDurationTime
  // if block.timestamp > baseStartTime
  struct IssueSchedule {
    uint256 baseIssueNo;
    uint256 baseStartTime;
    uint256 issueDurationTime;
  }

  struct ThemeSupport {
    bool supporting;
    string themeName;
    address themeAddress;
    uint256 startedTimeStamp;
    IssueSchedule issueSchedule;
    //include long-term & case-by-case part
    Balance balance;
    // gas refine - all operation of accumulateBalance has been commented
    Balance accumulateBalance;
    //case by case support; key - issue id; value - issue support info
    //gas refine - all operation of IssueSupport has been commented
    mapping(uint32 => IssueSupport) issues;
    // For upgradable, add one new variable above, minus 1 at here
    uint256[20] __gap;
  }

  // for return
  struct ThemeIssueNo {
    uint32 themeID;
    uint256 issueNo;
  }

  // for return
  struct ThemeIssueSchedule {
    uint32 themeAddr;
    IssueSchedule issueSchedule;
  }

  // for return
  struct SlotView {
    uint256 slotID;
    uint256[AssetTypeLimit] balance;
  }

  // for return
  struct IssueSupportView {
    uint256 issueID;
    SlotView[DefaultSlotUpperLimit] slotsView;
  }

  // for return
  struct BalanceView {
    uint256[AssetTypeLimit] assetsArray;
  }

  // for return
  struct ThemeSupportView {
    bool supporting;
    string themeName;
    address themeAddress;
    uint256 startedTimeStamp;
    IssueSchedule issueSchedule;
    //include long-term & case-by-case part
    BalanceView balances;
  }

  ICBPAddressesProvider public _addressesProvider;

  address[AssetTypeLimit] public _assetAddr;

  // mapping(uint256 => address) internal _assetAddr;
  mapping(uint32 => ThemeSupport) internal _themeSupport;

  /**
   * @dev Prevents a contract from calling itself, directly or indirectly.
   * Calling a `nonReentrant` function from another `nonReentrant`
   * function is not supported. It is possible to prevent this from happening
   * by making the `nonReentrant` function external, and making it call a
   * `private` function that does the actual work.
   */

  modifier nonReentrant() {
    // On the first call to nonReentrant, _notEntered will be true
    require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

    // Any calls to nonReentrant after this point will fail
    _status = _ENTERED;

    _;

    // By storing the original value once again, a refund is triggered (see
    // https://eips.ethereum.org/EIPS/eip-2200)
    _status = _NOT_ENTERED;
  }

  modifier whenNotPaused() {
    _whenNotPaused();
    _;
  }

  modifier onlyConfigurator() {
    _onlyConfigurator();
    _;
  }

  modifier onlyOperator() {
    _onlyOperator();
    _;
  }

  receive() external payable {
    emit Received(msg.sender, msg.value);
  }

  fallback() external payable {}

  function _whenNotPaused() internal view {
    require(!_paused, Errors.FUNCTION_IS_PAUSED);
  }

  function setPauseStatus(bool newPauseStatus) external nonReentrant onlyConfigurator {
    _paused = newPauseStatus;
  }

  function _onlyConfigurator() internal view {
    require(_addressesProvider.getConfigurator() == _msgSender(), Errors.LP_CALLER_NOT_SUPPORT_CONFIGURATOR);
  }

  function _onlyOperator() internal view {
    require(_addressesProvider.getOperator() == _msgSender(), Errors.LP_CALLER_NOT_SUPPORT_OPERATOR);
  }

  /**
   * @dev Function is invoked by the proxy contract when the Support contract is added to the
   * AddressesProvider
   * - Caching the address of the AddressesProvider in order to reduce gas consumption
   *   on subsequent operations
   * @param provider The address of the AddressesProvider
   **/
  function initialize(ICBPAddressesProvider provider) public initializer {
    _addressesProvider = provider;
    _slotUpperLimit = DefaultSlotUpperLimit;
  }

  function _converBalanceFromMapToArray(Balance storage balanceStorage) internal view returns (BalanceView memory) {
    BalanceView memory balanceView;

    for (uint256 k = uint256(SupportAssetType.ETH); k < uint256(SupportAssetType.Last); k++) {
      balanceView.assetsArray[k] = balanceStorage.assetMap[k];
    }

    return balanceView;
  }

  /**
   * @dev get themeSupport info
   * @param themeID The id of the theme
   **/
  function getThemeSupport(uint32 themeID) public view returns (ThemeSupportView memory) {
    ThemeSupportView memory themeSupportView;
    ThemeSupport storage themeSupport = _themeSupport[themeID];

    themeSupportView.supporting = themeSupport.supporting;
    themeSupportView.themeName = themeSupport.themeName;
    themeSupportView.themeAddress = themeSupport.themeAddress;

    themeSupportView.startedTimeStamp = themeSupport.startedTimeStamp;
    themeSupportView.issueSchedule = themeSupport.issueSchedule;

    themeSupportView.balances = _converBalanceFromMapToArray(themeSupport.balance);
    return themeSupportView;
  }

  /**
   * @dev set asset address
   * @param addrList New addrList to cover the existing arr
   */
  function setAssetsAddr(address[] calldata addrList) external override nonReentrant onlyConfigurator {
    require(addrList.length <= _assetAddr.length, Errors.VL_INVALID_AMOUNT);

    for (uint256 i = 0; i < _assetAddr.length; i++) {
      if (i < addrList.length) {
        _assetAddr[i] = addrList[i];
      } else {
        _assetAddr[i] = address(0);
      }
    }
  }

  /**
   * @dev set _slotUpperLimit
   * @param slotUpperLimit New slotUpperLimit to cover the existing
   */
  function setSlotUpperLimit(uint256 slotUpperLimit) external override nonReentrant onlyConfigurator {
    _slotUpperLimit = slotUpperLimit;
  }

  /**
   * @dev get asset address
   */
  function getAssetsAddr() external view override returns (address[] memory) {
    address[] memory addrReturn = new address[](AssetTypeLimit);
    for (uint256 i = 0; i < AssetTypeLimit; i++) {
      addrReturn[i] = _assetAddr[i];
    }
    return addrReturn;
  }

  /**
   * @dev Depositor support the theme by ether, usdc, or usdt
   * @param themeID The id of the NFT to be supported
   * @param assetType asset using to support;
   * @param supportAmount The amount of the above asset
   **/
  function longTermSupport(
    uint32 themeID,
    uint8 assetType,
    uint256 supportAmount
  ) external payable override nonReentrant whenNotPaused {
    //require msg.value > 0 or supportAmount > 0
    require(msg.value > 0 || supportAmount > 0, Errors.VL_INVALID_AMOUNT);
    require(_themeSupport[themeID].supporting, Errors.VL_COLLECTION_NOT_LIST);

    //assetType(uint8) to SupportAssetType(Enum) check
    SupportAssetType assetTypeEnum = SupportAssetType(assetType);
    uint256 actualSupportAmount = supportAmount;

    //
    if (assetTypeEnum == SupportAssetType.ETH) {
      require(msg.value > 0, Errors.VL_INVALID_AMOUNT);

      //add balance, accumulate Balance
      _themeSupport[themeID].balance.assetMap[assetType] += msg.value;
      // _themeSupport[themeID].accumulateBalance.assetMap[assetType] += msg.value;
      actualSupportAmount = msg.value;
    } else if (assetTypeEnum < SupportAssetType.Last) {
      require(supportAmount > 0, Errors.VL_INVALID_AMOUNT);

      // transfer ERC20  to this contract
      address assetAddr = _assetAddr[assetType];
      IERC20Upgradeable(assetAddr).transferFrom(msg.sender, address(this), supportAmount);

      //add balance, accumulate Balance
      _themeSupport[themeID].balance.assetMap[assetType] += supportAmount;
      // _themeSupport[themeID].accumulateBalance.assetMap[assetType] += supportAmount;
    } else {
      // revert
      revert("The assetType is not supported");
    }

    uint256 issueNo = _getThemeIssueNo(themeID);
    emit LongTermSupport(_msgSender(), themeID, issueNo, assetType, actualSupportAmount, block.timestamp);
  }

  /**
   * @dev Update the supporting status of themes
   * @param themeIDs The ids of the theme to be updated
   * @param newStatus set the themes to this status
   **/
  function updateStatus(uint32[] calldata themeIDs, bool newStatus) external override nonReentrant onlyConfigurator {
    require(themeIDs.length > 0, Errors.VL_INVALID_AMOUNT);

    for (uint256 i = 0; i < themeIDs.length; i++) {
      _themeSupport[themeIDs[i]].supporting = newStatus;
    }
  }

  //setup issue data
  /**
   * @dev Update the supporting issue info of theme
   * @param themeID The ids of the theme to be updated
   * @param baseIssueNo baseIssueNo of the Issue Data
   * @param baseStartTime baseStartTime of the Issue Data
   * @param issueDurationTime issueDurationTime of the Issue Data
   **/
  function updateThemeIssueSchedule(
    uint32 themeID,
    uint256 baseIssueNo,
    uint256 baseStartTime,
    uint256 issueDurationTime
  ) external override nonReentrant onlyConfigurator {
    require(issueDurationTime > 0, Errors.VL_INVALID_AMOUNT);
    _themeSupport[themeID].issueSchedule.baseIssueNo = baseIssueNo;
    _themeSupport[themeID].issueSchedule.baseStartTime = baseStartTime;
    _themeSupport[themeID].issueSchedule.issueDurationTime = issueDurationTime;
  }

  /**
   * @dev Update the supporting profile of theme
   * @param themeID The id of the theme to be updated
   * @param themeName themeName
   * @param themeAddress themeAddress
   **/
  function updateThemeProfile(
    uint32 themeID,
    string calldata themeName,
    address themeAddress
  ) external override nonReentrant onlyConfigurator {
    _themeSupport[themeID].themeName = themeName;
    _themeSupport[themeID].themeAddress = themeAddress;
  }

  /**
   * @dev  get issue no of themes
   * @param themes The ids of the theme to query
   **/
  function getThemesIssueNo(uint32[] calldata themes) public view returns (ThemeIssueNo[] memory) {
    require(themes.length > 0, Errors.VL_INVALID_AMOUNT);
    ThemeIssueNo[] memory themesIssueNo = new ThemeIssueNo[](themes.length);
    for (uint256 i = 0; i < themes.length; i++) {
      themesIssueNo[i].themeID = themes[i];
      themesIssueNo[i].issueNo = _getThemeIssueNo(themes[i]);
    }
    return themesIssueNo;
  }

  //get issueSchedule of themes
  /**
   * @dev  the supporting issue info of theme
   * @param themeIDs The ids of the theme to be updated
   **/
  function getThemesIssueSchedule(uint32[] calldata themeIDs) public view returns (ThemeIssueSchedule[] memory) {
    require(themeIDs.length > 0, Errors.VL_INVALID_AMOUNT);
    ThemeIssueSchedule[] memory themesIssueSchedule = new ThemeIssueSchedule[](themeIDs.length);
    for (uint256 i = 0; i < themeIDs.length; i++) {
      themesIssueSchedule[i].themeAddr = themeIDs[i];
      themesIssueSchedule[i].issueSchedule = _themeSupport[themeIDs[i]].issueSchedule;
    }
    return themesIssueSchedule;
  }

  /**
   * @dev  the current issue no of theme
   * @param themeID The id of the theme to be updated
   **/
  function _getThemeIssueNo(uint32 themeID) internal view returns (uint256) {
    IssueSchedule storage issueSchedule = _themeSupport[themeID].issueSchedule;
    if (issueSchedule.baseStartTime <= 0 || issueSchedule.issueDurationTime <= 0) {
      //no valid schedule for this theme currently
      return 0;
    } else {
      if (block.timestamp <= issueSchedule.baseStartTime) {
        return issueSchedule.baseIssueNo;
      } else {
        return
          issueSchedule.baseIssueNo + (block.timestamp - issueSchedule.baseStartTime) / issueSchedule.issueDurationTime;
      }
    }
  }

  // Case by case support
  /**
   * @dev Depositor support the theme case by case by ether, usdc, or usdt
   * @param themeID The id of the theme to be supported
   * @param assetType asset using to support;
   * @param supportAmount The amount of the above asset
   * @param issueNo only the current issue or the previous one is supportable
   * @param slotId The slotid of the supported item in this issue [0,30]
   **/
  function caseByCaseSupport(
    uint32 themeID,
    uint8 assetType,
    uint256 supportAmount,
    uint32 issueNo,
    uint32 slotId
  ) external payable override nonReentrant whenNotPaused {
    require(msg.value > 0 || supportAmount > 0, Errors.VL_INVALID_AMOUNT);
    require(_themeSupport[themeID].supporting, Errors.VL_COLLECTION_NOT_LIST);

    // check issueNo &
    require(issueNo > 0, Errors.VL_INVALID_ISSUE_NO);
    uint256 currentIssueNo = _getThemeIssueNo(themeID);
    require(currentIssueNo > 0, Errors.VL_INVALID_CURRENT_ISSUE_NO);
    require((issueNo == currentIssueNo) || (issueNo == (currentIssueNo - 1)), Errors.VL_INVALID_ISSUE_NO);

    // check slot id
    require(slotId >= SlotLowerLimit && slotId <= _slotUpperLimit, Errors.VL_INVALID_SLOTID);

    //assetType(uint8) to SupportAssetType(Enum) check
    SupportAssetType assetTypeEnum = SupportAssetType(assetType);
    uint256 actualSupportAmount = supportAmount;

    //
    if (assetTypeEnum == SupportAssetType.ETH) {
      require(msg.value > 0, Errors.VL_INVALID_AMOUNT);

      //add balance, accumulate Balance
      // _themeSupport[themeID].issues[issueNo].slots[slotId].balance.assetMap[assetType] += msg.value;
      _themeSupport[themeID].balance.assetMap[assetType] += msg.value;
      // _themeSupport[themeID].accumulateBalance.assetMap[assetType] += msg.value;
      actualSupportAmount = msg.value;
    } else if (assetTypeEnum < SupportAssetType.Last) {
      require(supportAmount > 0, Errors.VL_INVALID_AMOUNT);

      // transfer ERC20  to this contract
      address assetAddr = _assetAddr[assetType];
      IERC20Upgradeable(assetAddr).transferFrom(msg.sender, address(this), supportAmount);

      //add balance, accumulate Balance
      // _themeSupport[themeID].issues[issueNo].slots[slotId].balance.assetMap[assetType] += supportAmount;
      _themeSupport[themeID].balance.assetMap[assetType] += supportAmount;
      // _themeSupport[themeID].accumulateBalance.assetMap[assetType] += supportAmount;
    } else {
      // revert
      revert("The assetType is not supported");
    }

    // uint256 currentIssueNo = _getThemeIssueNo(themeID);
    emit CaseByCaseSupport(_msgSender(), themeID, issueNo, slotId, assetType, actualSupportAmount, block.timestamp);
  }

  // get the theme's issues info
  /**
   * @dev get the theme's issues info
   * @param themeID The id of the theme to be supported
   * @param issueFrom starting issue
   * @param issueTo ending issue
   **/
  function getThemeIssuesData(
    uint32 themeID,
    uint256 issueFrom,
    uint256 issueTo
  ) public view returns (IssueSupportView[] memory) {
    require(issueFrom > 0 && issueTo > 0 && issueFrom <= issueTo, Errors.VL_INVALID_ISSUE_NO);
    IssueSupportView[] memory issuesView = new IssueSupportView[](issueTo - issueFrom + 1);
    mapping(uint32 => IssueSupport) storage issues = _themeSupport[themeID].issues;
    for (uint256 i = issueFrom; i <= issueTo; i++) {
      IssueSupportView memory issue;
      issue.issueID = i;

      // If the actural slot number is bigger than default value, it can't be fetched by this func
      for (uint256 j = SlotLowerLimit; j <= DefaultSlotUpperLimit; j++) {
        SlotView memory slotView;
        slotView.slotID = j;

        for (uint256 k = uint256(SupportAssetType.ETH); k < uint256(SupportAssetType.Last); k++) {
          slotView.balance[k] = issues[uint32(i)].slots[j].balance.assetMap[k];
        }
        issue.slotsView[j - 1] = slotView;
      }
      issuesView[issueFrom - i] = issue;
    }
    return issuesView;
  }

  // TODO - Add batch settle the Theme Issue func  - Delayed
  /* func draft 
    function withdrawForOneIssue(
    uint32[] themeID,
    uint32[] issueNo,
    address operatorAddr,
    uint256[] memory ETHAmount
  ) external override nonReentrant onlyOperator {
  */

  // Withdraw asset for theme issue supporting

  /**
   * @dev withdrawForOneIssue
   * @param themeID The id of the theme to withdraw
   * @param issueNo withdraw for this issue
   * @param operatorAddr withdraw to this operator for handling
   * @param assetsAmount assets amount to withdraw; see SupportAssetType
   **/
  function withdrawForOneIssue(
    uint32 themeID,
    uint32 issueNo,
    address operatorAddr,
    uint256[] memory assetsAmount
  ) external override nonReentrant onlyOperator {
    require(
      assetsAmount.length > 0 && assetsAmount.length <= uint32(SupportAssetType.Last),
      Errors.VL_INVALID_ASSETARRAY_LENGTH
    );

    require(operatorAddr != address(0), Errors.SUPPORT_INVALID_ADDRESS);

    ThemeSupport storage themeSupport = _themeSupport[themeID];
    for (uint256 i = 0; i < assetsAmount.length; i++) {
      require(themeSupport.balance.assetMap[i] >= assetsAmount[i], Errors.SUPPORT_INVALID_WITHDRAW_BALANCE);

      //transfer
      if (assetsAmount[i] <= 0) {
        continue;
      }

      //assetType(uint8) to SupportAssetType(Enum) check
      SupportAssetType assetTypeEnum = SupportAssetType(i);
      // uint256 actualTransferAmount = assetsAmount;

      //
      if (assetTypeEnum == SupportAssetType.ETH) {
        themeSupport.balance.assetMap[i] -= assetsAmount[i];

        //transfer ETH
        payable(operatorAddr).transfer(assetsAmount[i]);
        emit WithdrawForIssue(
          themeID,
          issueNo,
          msg.sender,
          operatorAddr,
          uint8(assetTypeEnum),
          address(0),
          assetsAmount[i]
        );
      } else if (assetTypeEnum < SupportAssetType.Last) {
        // transfer ERC20  to this contract
        themeSupport.balance.assetMap[i] -= assetsAmount[i];

        address assetAddr = _assetAddr[i];
        bool transferResult = IERC20Upgradeable(assetAddr).transfer(operatorAddr, assetsAmount[i]);
        require(transferResult, Errors.SUPPORT_TRANSFER_FAILED);
        emit WithdrawForIssue(
          themeID,
          issueNo,
          msg.sender,
          operatorAddr,
          uint8(assetTypeEnum),
          assetAddr,
          assetsAmount[i]
        );
      } else {
        // revert
        revert("The assetType is not supported");
      }
    }
  }

  /**
   * @dev batchWithdrawETH
   * @param themeIDs The id array of the theme to withdraw
   * @param issues The issue array of the themeIDs to withdraw
   * @param operatorAddr withdraw to this operator for handling
   * @param ethAmounts amount of ETH to withdraw
   **/
  function batchWithdrawETH(
    uint32[] memory themeIDs,
    uint32[] memory issues,
    address operatorAddr,
    uint256[] memory ethAmounts
  ) external override nonReentrant onlyOperator {
    //check balance
    require(
      themeIDs.length > 0 && issues.length == themeIDs.length && themeIDs.length == ethAmounts.length,
      Errors.VL_INVALID_THEMEIDS_LENGTH
    );

    uint256 ethWithdrawTotal = 0;
    for (uint256 i = 0; i < themeIDs.length; i++) {
      ThemeSupport storage themeSupport = _themeSupport[themeIDs[i]];
      require(
        themeSupport.balance.assetMap[uint256(SupportAssetType.ETH)] >= ethAmounts[i],
        Errors.SUPPORT_INVALID_WITHDRAW_BALANCE
      );
      themeSupport.balance.assetMap[uint256(SupportAssetType.ETH)] -= ethAmounts[i];
      ethWithdrawTotal += ethAmounts[i];
      emit WithdrawFromTheme(
        themeIDs[i],
        issues[i],
        msg.sender,
        operatorAddr,
        uint8(SupportAssetType.ETH),
        address(0),
        ethAmounts[i]
      );
    }

    //withdraw
    payable(operatorAddr).transfer(ethWithdrawTotal);
  }

  /**
   * @dev raw Withdraw with comment
   * @param assetsAmount assets amount to withdraw; see SupportAssetType
   * @param operatorAddr operatorAddr
   * @param comment comments
   */
  function rawWithdraw(
    uint256[] memory assetsAmount,
    address operatorAddr,
    string memory comment
  ) external override nonReentrant onlyConfigurator {
    require(
      assetsAmount.length > 0 && assetsAmount.length <= uint32(SupportAssetType.Last),
      Errors.VL_INVALID_ASSETARRAY_LENGTH
    );

    require(operatorAddr != address(0), Errors.SUPPORT_INVALID_ADDRESS);

    for (uint256 i = 0; i < assetsAmount.length; i++) {
      //transfer
      if (assetsAmount[i] <= 0) {
        continue;
      }

      //assetType(uint8) to SupportAssetType(Enum) check
      SupportAssetType assetTypeEnum = SupportAssetType(i);
      // uint256 actualTransferAmount = assetsAmount;

      //
      if (assetTypeEnum == SupportAssetType.ETH) {
        //transfer ETH
        payable(operatorAddr).transfer(assetsAmount[i]);
        emit RawWithdraw(msg.sender, operatorAddr, uint8(assetTypeEnum), address(0), assetsAmount[i], comment);
      } else if (assetTypeEnum < SupportAssetType.Last) {
        // transfer ERC20  to this operator addr
        address assetAddr = _assetAddr[i];
        bool transferResult = IERC20Upgradeable(assetAddr).transfer(operatorAddr, assetsAmount[i]);
        require(transferResult, Errors.SUPPORT_TRANSFER_FAILED);

        emit RawWithdraw(msg.sender, operatorAddr, uint8(assetTypeEnum), assetAddr, assetsAmount[i], comment);
      } else {
        // revert
        revert("The assetType is not supported");
      }
    }
  }
}
