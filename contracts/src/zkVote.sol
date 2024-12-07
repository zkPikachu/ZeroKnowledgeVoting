pragma solidity ^0.8.13;

contract zkVote {
    /// The hash of the identifier of the proving system used (groth16 in this case)
    bytes32 public constant PROVING_SYSTEM_ID =
        keccak256(abi.encodePacked("groth16"));

    /// The address of the ZkvAttestationContract
    address public immutable zkvContract;
    /// The hash of the verification key of the circuit
    bytes32 public immutable vkHash;

    /// A mapping for recording the addresses which have submitted valid proofs
    mapping(address => bool) public hasSubmittedValidProof;

    // A mapping to store voteCommitment values to ensure no duplication
    mapping(uint256 => bool) public recordedVotes;

    // A mapping to prevent double voting using nullifiers
    mapping(uint256 => bool) public nullifiersUsed;

    event SuccessfulProofSubmission(
        address indexed from,
        uint256 voteCommitment
    );
    event VoteRecorded(uint256 voteCommitment);

    constructor(address _zkvContract, bytes32 _vkHash) {
        zkvContract = _zkvContract;
        vkHash = _vkHash;
    }
    // This function allows voters to cast a vote and ensure the vote is valid, unique and anonymous
    function proveVoteWasCast(
        uint256 attestationId,
        uint256 root,  // Merkle root
        uint256 nullifier,
        bytes32[] calldata merklePath,
        uint256 leafCount,
        uint256 index,
        uint256 voteCommitment // Hash of vote and randomness r
    ) external {
        require(
            _verifyProofHasBeenPostedToZkv(
                attestationId,
                root,
                nullifier,
                merklePath,
                leafCount,
                index
            ),
            "Proof verification failed"
        );

        // Ensure the nullifier has not been used (to prevent double voting)
        require(!nullifiersUsed[nullifier], "Nullifier already used");
        nullifiersUsed[nullifier] = true;

        // Record the vote commitment
        require(!recordedVotes[voteCommitment], "Vote already recorded");
        recordedVotes[voteCommitment] = true;

        // Mark the voter as having submitted a valid proof
        hasSubmittedValidProof[msg.sender] = true;

        emit SuccessfulProofSubmission(msg.sender, voteCommitment);
        emit VoteRecorded(voteCommitment);
    }
    // This function verifies the proof against the zkVerify contract
    function _verifyProofHasBeenPostedToZkv(
        uint256 attestationId,
        uint256 root,
        uint256 nullifier,
        bytes32[] calldata merklePath,
        uint256 leafCount,
        uint256 index
    ) internal view returns (bool) {
        uint256 rootLittleEndian = _changeEndianess(root);
        uint256 nullifierLittleEndian = _changeEndianess(nullifier);

        bytes memory encodedInput = abi.encodePacked(
            rootLittleEndian,
            nullifierLittleEndian
        );
        bytes32 leaf = keccak256(
            abi.encodePacked(PROVING_SYSTEM_ID, vkHash, keccak256(encodedInput))
        );

        (bool callSuccessful, bytes memory validProof) = zkvContract.staticcall(
            abi.encodeWithSignature(
                "verifyProofAttestation(uint256,bytes32,bytes32[],uint256,uint256)",
                attestationId,
                leaf,
                merklePath,
                leafCount,
                index
            )
        );

        require(callSuccessful, "Failed to call zkvContract");

        return abi.decode(validProof, (bool));
    }

    /// Utility function to efficiently change the endianess of its input (zkVerify groth16
    /// pallet uses big-endian encoding of public inputs, while the EVM uses little-endian).
    function _changeEndianess(uint256 input) internal pure returns (uint256 v) {
        v = input;
        // swap bytes
        v =
            ((v &
                0xFF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00) >>
                8) |
            ((v &
                0x00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF) <<
                8);
        // swap 2-byte pairs
        v =
            ((v &
                0xFFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000) >>
                16) |
            ((v &
                0x0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF) <<
                16);
        // swap 4-byte pairs
        v =
            ((v &
                0xFFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000) >>
                32) |
            ((v &
                0x00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF) <<
                32);
        // swap 8-byte pairs
        v =
            ((v &
                0xFFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF0000000000000000) >>
                64) |
            ((v &
                0x0000000000000000FFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF) <<
                64);
        // swap 16-byte pairs
        v = (v >> 128) | (v << 128);
    }
}