package opcback.transfers.repository;

import opcback.transfers.entity.TransferEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransferEventRepository extends JpaRepository<TransferEvent, Long> {

    List<TransferEvent> findByTransferIdOrderByEventDateAsc(Long transferId);
}
