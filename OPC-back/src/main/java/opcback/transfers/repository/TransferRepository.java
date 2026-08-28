package opcback.transfers.repository;

import opcback.transfers.entity.Transfer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransferRepository extends JpaRepository<Transfer, Long> {

    boolean existsByTransferNumber(String transferNumber);
}
