package com.group5.backend.service;

import com.group5.backend.model.dto.CompanyProfileResponse;
import com.group5.backend.model.dto.FollowingResponse;
import com.group5.backend.model.entity.FollowingItem;
import com.group5.backend.model.enums.AssetType;
import com.group5.backend.repository.FollowingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
public class FollowingService {

    private final FollowingRepository followingRepository;
    private final FinnhubService finnhubService;

    public FollowingService(FollowingRepository followingRepository, FinnhubService finnhubService) {
        this.followingRepository = followingRepository;
        this.finnhubService = finnhubService;
    }

    public List<FollowingResponse> getAll() {
        return followingRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public FollowingResponse add(String symbol, AssetType type) {
        String normalizedSymbol = normalizeSymbol(symbol);
        AssetType normalizedType = normalizeType(type);

        if (followingRepository.existsBySymbol(normalizedSymbol)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already followed");
        }

        FollowingItem item = new FollowingItem();
        item.setSymbol(normalizedSymbol);
        item.setName(resolveCompanyName(normalizedSymbol));
        item.setType(normalizedType);

        return toResponse(followingRepository.save(item));
    }

    public void deleteById(Long id) {
        if (!followingRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Following item not found");
        }

        followingRepository.deleteById(id);
    }

    private String normalizeSymbol(String symbol) {
        if (!StringUtils.hasText(symbol)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "symbol cannot be empty");
        }

        return symbol.trim().toUpperCase(Locale.ROOT);
    }

    private AssetType normalizeType(AssetType type) {
        if (type == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "type is required");
        }

        return type;
    }

    private FollowingResponse toResponse(FollowingItem item) {
        return new FollowingResponse(
                item.getId(),
                item.getSymbol(),
                item.getName(),
                item.getType(),
                item.getCreatedAt()
        );
    }

    private String resolveCompanyName(String symbol) {
        try {
            CompanyProfileResponse profile = finnhubService.getCompanyProfile(symbol, null, null);
            if (StringUtils.hasText(profile.name())) {
                return profile.name();
            }
        } catch (Exception ignored) {
        }

        return symbol;
    }
}
