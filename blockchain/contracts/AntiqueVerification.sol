// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AntiqueVerification {

    struct Antique {
        string serialId;
        string name;
        string owner;
        string manufactureDate;
        string material;
        bool blockchainVerified;
    }

    mapping(string => Antique) public antiques;

    event AntiqueRegistered(
        string serialId,
        string name,
        string owner
    );

    event OwnershipTransferred(
        string serialId,
        string newOwner
    );

    // Admin registers antique after approval
    function registerAntique(
        string memory _serialId,
        string memory _name,
        string memory _owner,
        string memory _manufactureDate,
        string memory _material
    ) public {

        antiques[_serialId] = Antique({
            serialId: _serialId,
            name: _name,
            owner: _owner,
            manufactureDate: _manufactureDate,
            material: _material,
            blockchainVerified: true
        });

        emit AntiqueRegistered(_serialId, _name, _owner);
    }

    // Owner transfers ownership to buyer
    function transferOwnership(
        string memory _serialId,
        string memory _newOwner
    ) public {

        require(
            antiques[_serialId].blockchainVerified == true,
            "Antique not verified"
        );

        antiques[_serialId].owner = _newOwner;

        emit OwnershipTransferred(_serialId, _newOwner);
    }

    // Anyone can verify antique authenticity
    function getAntique(string memory _serialId)
        public
        view
        returns(
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            bool
        )
    {
        Antique memory a = antiques[_serialId];

        return (
            a.serialId,
            a.name,
            a.owner,
            a.manufactureDate,
            a.material,
            a.blockchainVerified
        );
    }
}