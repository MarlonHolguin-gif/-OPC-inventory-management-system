package opcback.branches.dto;

import opcback.branches.entity.Branch;

public record BranchResponse(
        Long id,
        String code,
        String name,
        String address,
        String city,
        String phone,
        boolean active
) {
    public static BranchResponse from(Branch branch) {
        return new BranchResponse(branch.getId(), branch.getCode(), branch.getName(), branch.getAddress(),
                branch.getCity(), branch.getPhone(), branch.isActive());
    }
}
