package com.group5.backend.repository;

import com.group5.backend.model.entity.TradeHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TradeRepository extends JpaRepository<TradeHistory, Long> {
    // 简单的查询示例：按名称模糊查询
    List<TradeHistory> findByStockNameContaining(String stockName);
}

