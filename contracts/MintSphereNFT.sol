// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint16, euint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256 balance);

    function ownerOf(uint256 tokenId) external view returns (address owner);

    function safeTransferFrom(address from, address to, uint256 tokenId) external;

    function transferFrom(address from, address to, uint256 tokenId) external;

    function approve(address to, uint256 tokenId) external;

    function getApproved(uint256 tokenId) external view returns (address operator);

    function setApprovalForAll(address operator, bool _approved) external;

    function isApprovedForAll(address owner, address operator) external view returns (bool);

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
}

interface IERC721Metadata is IERC721 {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function tokenURI(uint256 tokenId) external view returns (string memory);
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4);
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

library Address {
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }
}

library Strings {
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

contract MintSphereNFT is Context, IERC721Metadata, ZamaEthereumConfig {
    using Address for address;
    using Strings for uint256;

    struct SphereMetadata {
        euint16 sphereValue;
        uint64 mintedAt;
    }

    string private _name;
    string private _symbol;
    string private _baseTokenURI;

    address private _owner;
    uint256 private _nextTokenId;
    uint256 private _totalMinted;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    mapping(address => uint256[]) private _ownedTokens;
    mapping(uint256 => uint256) private _ownedTokensIndex;

    mapping(uint256 => SphereMetadata) private _sphereMetadata;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SphereMinted(address indexed owner, uint256 indexed tokenId, bytes32 ciphertext);

    modifier onlyOwner() {
        require(_owner == _msgSender(), "MintSphereNFT: caller is not the owner");
        _;
    }

    constructor(string memory name_, string memory symbol_, string memory baseTokenURI_) {
        _owner = _msgSender();
        _name = name_;
        _symbol = symbol_;
        _baseTokenURI = baseTokenURI_;
        emit OwnershipTransferred(address(0), _owner);
    }

    // -------------------- ERC165 --------------------
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId || interfaceId == type(IERC721).interfaceId
                || interfaceId == type(IERC721Metadata).interfaceId;
    }

    // -------------------- ERC721 Metadata --------------------
    function name() external view override returns (string memory) {
        return _name;
    }

    function symbol() external view override returns (string memory) {
        return _symbol;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireMinted(tokenId);
        string memory baseURI = _baseTokenURI;
        if (bytes(baseURI).length == 0) {
            return "";
        }
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    function baseTokenURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    // -------------------- Ownership --------------------
    function owner() external view returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "MintSphereNFT: zero address");
        address previousOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    // -------------------- Minting --------------------
    function mintSphere() external returns (uint256) {
        return _mintSphere(_msgSender());
    }

    function mintSphereFor(address receiver) external onlyOwner returns (uint256) {
        return _mintSphere(receiver);
    }

    function _mintSphere(address receiver) internal returns (uint256) {
        require(receiver != address(0), "MintSphereNFT: receiver is zero address");
        uint256 tokenId = ++_nextTokenId;
        _safeMint(receiver, tokenId);
        _totalMinted += 1;

        euint32 randomValue = FHE.randEuint32();
        euint32 bounded32 = FHE.rem(randomValue, uint32(100));
        euint16 bounded = FHE.asEuint16(bounded32);
        euint16 sphereValue = FHE.add(bounded, uint16(1));

        SphereMetadata storage metadata = _sphereMetadata[tokenId];
        metadata.sphereValue = sphereValue;
        metadata.mintedAt = uint64(block.timestamp);

        FHE.allowThis(metadata.sphereValue);
        FHE.allow(metadata.sphereValue, receiver);

        emit SphereMinted(receiver, tokenId, euint16.unwrap(metadata.sphereValue));
        return tokenId;
    }

    // -------------------- Sphere Views --------------------
    function getSphereCiphertext(uint256 tokenId) external view returns (euint16) {
        _requireMinted(tokenId);
        return _sphereMetadata[tokenId].sphereValue;
    }

    function getTokenMetadata(uint256 tokenId) external view returns (uint64 mintedAt, string memory uri) {
        _requireMinted(tokenId);
        SphereMetadata storage data = _sphereMetadata[tokenId];
        mintedAt = data.mintedAt;
        uri = tokenURI(tokenId);
    }

    function tokensOfOwner(address wallet) external view returns (uint256[] memory) {
        uint256[] storage stored = _ownedTokens[wallet];
        uint256[] memory result = new uint256[](stored.length);
        for (uint256 i = 0; i < stored.length; i++) {
            result[i] = stored[i];
        }
        return result;
    }

    function totalSupply() external view returns (uint256) {
        return _totalMinted;
    }

    function mintedTimestamp(uint256 tokenId) external view returns (uint64) {
        _requireMinted(tokenId);
        return _sphereMetadata[tokenId].mintedAt;
    }

    // -------------------- ERC721 Core --------------------
    function balanceOf(address owner_) public view override returns (uint256) {
        require(owner_ != address(0), "MintSphereNFT: balance query for zero address");
        return _balances[owner_];
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner_ = _owners[tokenId];
        require(owner_ != address(0), "MintSphereNFT: invalid token ID");
        return owner_;
    }

    function approve(address to, uint256 tokenId) external override {
        address owner_ = ownerOf(tokenId);
        require(to != owner_, "MintSphereNFT: approval to current owner");
        require(_msgSender() == owner_ || isApprovedForAll(owner_, _msgSender()), "MintSphereNFT: not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner_, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        _requireMinted(tokenId);
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external override {
        require(operator != _msgSender(), "MintSphereNFT: approve to caller");
        _operatorApprovals[_msgSender()][operator] = approved;
        emit ApprovalForAll(_msgSender(), operator, approved);
    }

    function isApprovedForAll(address owner_, address operator) public view override returns (bool) {
        return _operatorApprovals[owner_][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "MintSphereNFT: not approved nor owner");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external override {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "MintSphereNFT: not approved nor owner");
        _safeTransfer(from, to, tokenId, data);
    }

    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory data) internal {
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "MintSphereNFT: transfer to non ERC721Receiver");
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _owners[tokenId] != address(0);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner_ = ownerOf(tokenId);
        return spender == owner_ || getApproved(tokenId) == spender || isApprovedForAll(owner_, spender);
    }

    function _safeMint(address to, uint256 tokenId) internal {
        _mint(to, tokenId);
        require(_checkOnERC721Received(address(0), to, tokenId, ""), "MintSphereNFT: transfer to non ERC721Receiver");
    }

    function _mint(address to, uint256 tokenId) internal {
        require(to != address(0), "MintSphereNFT: mint to zero address");
        require(!_exists(tokenId), "MintSphereNFT: token already minted");
        _beforeTokenTransfer(address(0), to, tokenId);
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
        _afterTokenTransfer(address(0), to, tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "MintSphereNFT: transfer from incorrect owner");
        require(to != address(0), "MintSphereNFT: transfer to zero address");
        _beforeTokenTransfer(from, to, tokenId);
        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
        _afterTokenTransfer(from, to, tokenId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal {
        if (from != address(0)) {
            _removeTokenFromOwnerEnumeration(from, tokenId);
        }
        if (to != address(0)) {
            _addTokenToOwnerEnumeration(to, tokenId);
        }
    }

    function _afterTokenTransfer(address from, address to, uint256 tokenId) internal {
        if (to != address(0)) {
            SphereMetadata storage data = _sphereMetadata[tokenId];
            if (euint16.unwrap(data.sphereValue) != bytes32(0)) {
                FHE.allow(data.sphereValue, to);
            }
        }
        if (from == address(0)) {
            return;
        }
    }

    function _addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
        _ownedTokensIndex[tokenId] = _ownedTokens[to].length;
        _ownedTokens[to].push(tokenId);
    }

    function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) private {
        uint256 length = _ownedTokens[from].length;
        require(length > 0, "MintSphereNFT: owner has no tokens");
        uint256 lastTokenIndex = length - 1;
        uint256 tokenIndex = _ownedTokensIndex[tokenId];
        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastTokenIndex];
            _ownedTokens[from][tokenIndex] = lastTokenId;
            _ownedTokensIndex[lastTokenId] = tokenIndex;
        }
        _ownedTokens[from].pop();
        delete _ownedTokensIndex[tokenId];
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data)
        private
        returns (bool)
    {
        if (!to.isContract()) {
            return true;
        }
        try IERC721Receiver(to).onERC721Received(_msgSender(), from, tokenId, data) returns (bytes4 retval) {
            return retval == IERC721Receiver.onERC721Received.selector;
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert("MintSphereNFT: transfer to non ERC721Receiver");
            } else {
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        }
    }

    function _requireMinted(uint256 tokenId) internal view {
        require(_exists(tokenId), "MintSphereNFT: invalid token ID");
    }
}
