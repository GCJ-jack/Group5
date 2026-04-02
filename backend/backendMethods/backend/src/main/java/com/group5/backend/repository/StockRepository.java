package com.group5.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.group5.backend.model.entity.StockAll;
import java.util.Optional;

public interface StockRepository extends JpaRepository<StockAll, Long> {
    Optional<StockAll> findBySymbol(String symbol);
}
