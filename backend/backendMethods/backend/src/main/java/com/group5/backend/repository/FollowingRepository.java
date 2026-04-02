package com.group5.backend.repository;

import com.group5.backend.model.entity.FollowingItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FollowingRepository extends JpaRepository<FollowingItem, Long> {

    Optional<FollowingItem> findBySymbol(String symbol);

    boolean existsBySymbol(String symbol);

    void deleteBySymbol(String symbol);
}
