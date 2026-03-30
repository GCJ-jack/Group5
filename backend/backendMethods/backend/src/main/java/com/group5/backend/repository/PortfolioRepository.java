package com.group5.backend.repository;

import com.group5.backend.model.PortfolioItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioRepository extends JpaRepository<PortfolioItem, Long> {
}
