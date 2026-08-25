package opcback.auth.repository;

import opcback.auth.entity.UserBranch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserBranchRepository extends JpaRepository<UserBranch, Long> {

    @Query("select ub.branchId from UserBranch ub where ub.userId = :userId")
    List<Long> findBranchIdsByUserId(Long userId);

    Optional<UserBranch> findByUserIdAndBranchId(Long userId, Long branchId);
}
