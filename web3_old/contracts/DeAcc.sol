// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DeAcc {
    address public admin;
    
    enum AccidentStatus { Pending, Approved, Rejected }
    
    struct Accident {
        string location;
        string description;
        uint256 timestamp;
        AccidentStatus status;
        string imageHash;
        address reporter;
    }

    mapping(uint256 => Accident) public accidents;
    uint256 public accidentCount;
    uint256 public pendingAccidentCount;
    uint256 public approvedAccidentCount;
    uint256 public rejectedAccidentCount;

    event AccidentReported(
        uint256 indexed accidentId,
        string location,
        string description,
        uint256 timestamp,
        address indexed reporter
    );

    event AccidentApproved(uint256 indexed accidentId);
    event AccidentRejected(uint256 indexed accidentId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender; // Set deployer as admin
    }

    function reportAccident(
        string memory _location,
        string memory _description,
        string memory _imageHash
    ) public {
        accidentCount++;
        pendingAccidentCount++;
        
        accidents[accidentCount] = Accident({
            location: _location,
            description: _description,
            timestamp: block.timestamp,
            status: AccidentStatus.Pending,
            imageHash: _imageHash,
            reporter: msg.sender
        });

        emit AccidentReported(
            accidentCount, 
            _location, 
            _description, 
            block.timestamp,
            msg.sender
        );
    }

    function approveAccident(uint256 _accidentId) public onlyAdmin {
        require(_accidentId <= accidentCount, "Accident does not exist");
        require(accidents[_accidentId].status == AccidentStatus.Pending, "Accident is not in pending status");
        
        accidents[_accidentId].status = AccidentStatus.Approved;
        pendingAccidentCount--;
        approvedAccidentCount++;
        
        emit AccidentApproved(_accidentId);
    }

    function rejectAccident(uint256 _accidentId) public onlyAdmin {
        require(_accidentId <= accidentCount, "Accident does not exist");
        require(accidents[_accidentId].status == AccidentStatus.Pending, "Accident is not in pending status");
        
        accidents[_accidentId].status = AccidentStatus.Rejected;
        pendingAccidentCount--;
        rejectedAccidentCount++;
        
        emit AccidentRejected(_accidentId);
    }

    function getAccident(uint256 _accidentId) public view returns (
        string memory location,
        string memory description,
        uint256 timestamp,
        AccidentStatus status,
        string memory imageHash,
        address reporter
    ) {
        require(_accidentId <= accidentCount, "Accident does not exist");
        Accident memory accident = accidents[_accidentId];
        return (
            accident.location,
            accident.description,
            accident.timestamp,
            accident.status,
            accident.imageHash,
            accident.reporter
        );
    }
    
    function isApproved(uint256 _accidentId) public view returns (bool) {
        require(_accidentId <= accidentCount, "Accident does not exist");
        return accidents[_accidentId].status == AccidentStatus.Approved;
    }
    
    function isRejected(uint256 _accidentId) public view returns (bool) {
        require(_accidentId <= accidentCount, "Accident does not exist");
        return accidents[_accidentId].status == AccidentStatus.Rejected;
    }
    
    function isPending(uint256 _accidentId) public view returns (bool) {
        require(_accidentId <= accidentCount, "Accident does not exist");
        return accidents[_accidentId].status == AccidentStatus.Pending;
    }
    
    function transferAdmin(address newAdmin) public onlyAdmin {
        require(newAdmin != address(0), "New admin cannot be zero address");
        admin = newAdmin;
    }
} 