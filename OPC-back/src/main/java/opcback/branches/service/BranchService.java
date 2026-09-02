package opcback.branches.service;

import lombok.RequiredArgsConstructor;
import opcback.branches.dto.BranchCreateRequest;
import opcback.branches.dto.BranchResponse;
import opcback.branches.dto.BranchUpdateRequest;
import opcback.branches.entity.Branch;
import opcback.branches.repository.BranchRepository;
import opcback.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BranchService {

    private final BranchRepository branchRepository;

    public List<BranchResponse> listAll() {
        return branchRepository.findAll().stream()
                .map(BranchResponse::from)
                .toList();
    }

    public BranchResponse getById(Long id) {
        return BranchResponse.from(findBranchOrThrow(id));
    }

    @Transactional
    public BranchResponse create(BranchCreateRequest request) {
        Branch branch = new Branch();
        branch.setCode(request.code());
        branch.setName(request.name());
        branch.setAddress(request.address());
        branch.setCity(request.city());
        branch.setPhone(request.phone());
        branch.setActive(true);

        LocalDateTime now = LocalDateTime.now();
        branch.setCreatedAt(now);
        branch.setUpdatedAt(now);

        return BranchResponse.from(branchRepository.save(branch));
    }

    @Transactional
    public BranchResponse update(Long id, BranchUpdateRequest request) {
        Branch branch = findBranchOrThrow(id);
        branch.setName(request.name());
        branch.setAddress(request.address());
        branch.setCity(request.city());
        branch.setPhone(request.phone());
        branch.setUpdatedAt(LocalDateTime.now());

        return BranchResponse.from(branchRepository.save(branch));
    }

    @Transactional
    public BranchResponse deactivate(Long id) {
        Branch branch = findBranchOrThrow(id);
        branch.setActive(false);
        branch.setUpdatedAt(LocalDateTime.now());

        return BranchResponse.from(branchRepository.save(branch));
    }

    @Transactional
    public BranchResponse reactivate(Long id) {
        Branch branch = findBranchOrThrow(id);
        branch.setActive(true);
        branch.setUpdatedAt(LocalDateTime.now());

        return BranchResponse.from(branchRepository.save(branch));
    }

    private Branch findBranchOrThrow(Long id) {
        return branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada: " + id));
    }
}
