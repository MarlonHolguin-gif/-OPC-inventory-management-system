package opcback.auth.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.repository.UserBranchRepository;
import opcback.auth.repository.UserRepository;
import opcback.auth.entity.UserBranch;
import opcback.branches.repository.BranchRepository;
import opcback.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserBranchService {

    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final UserBranchRepository userBranchRepository;

    public List<Long> listBranchIds(Long userId) {
        assertUserExists(userId);
        return userBranchRepository.findBranchIdsByUserId(userId);
    }

    @Transactional
    public List<Long> assign(Long userId, Long branchId) {
        assertUserExists(userId);
        assertBranchExists(branchId);

        if (userBranchRepository.findByUserIdAndBranchId(userId, branchId).isEmpty()) {
            UserBranch userBranch = new UserBranch();
            userBranch.setUserId(userId);
            userBranch.setBranchId(branchId);
            userBranchRepository.save(userBranch);
        }

        return userBranchRepository.findBranchIdsByUserId(userId);
    }

    @Transactional
    public List<Long> revoke(Long userId, Long branchId) {
        assertUserExists(userId);
        assertBranchExists(branchId);

        userBranchRepository.findByUserIdAndBranchId(userId, branchId)
                .ifPresent(userBranchRepository::delete);

        return userBranchRepository.findBranchIdsByUserId(userId);
    }

    private void assertUserExists(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("Usuario no encontrado: " + userId);
        }
    }

    private void assertBranchExists(Long branchId) {
        if (!branchRepository.existsById(branchId)) {
            throw new ResourceNotFoundException("Sucursal no encontrada: " + branchId);
        }
    }
}
