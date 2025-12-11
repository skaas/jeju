// Google Maps 초기화
let map;
let markers = [];
let infoWindows = [];
let restaurantsData = []; // 음식점 데이터 저장

// Google Sheets에서 데이터 가져오기
async function loadRestaurantData() {
    const loadBtn = document.getElementById('loadDataBtn');
    const restaurantCount = document.getElementById('restaurantCount');
    const restaurantInfo = document.getElementById('restaurantInfo');
    
    loadBtn.disabled = true;
    loadBtn.textContent = '데이터 불러오는 중...';
    restaurantInfo.innerHTML = '<div class="loading">데이터를 불러오는 중입니다...</div>';
    
    try {
        // 서버 사이드 API를 통해 데이터 가져오기 (Sheets ID는 서버에서만 사용)
        console.log('서버 API를 통해 데이터를 가져오는 중...');
        const response = await fetch('/api/sheets', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `서버 오류: HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.data) {
            throw new Error(result.error || '데이터를 가져올 수 없습니다.');
        }
        
        const csvText = result.data;
        
        const restaurants = parseCSV(csvText);
        
        if (restaurants.length === 0) {
            throw new Error('데이터를 찾을 수 없습니다. 시트에 위도/경도 정보가 있는지 확인해주세요.');
        }
        
        // 음식점 데이터 저장
        restaurantsData = restaurants;
        
        // 기존 마커 제거
        clearMarkers();
        
        // 지도에 마커 추가
        displayRestaurants(restaurants);
        
        // 초기 정보 패널 업데이트는 updateMarkersByVisibleBounds()에서 처리
        // (현재 보이는 음식점만 표시)
        
        restaurantCount.textContent = `${restaurants.length}개의 음식점`;
        
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        restaurantInfo.innerHTML = `
            <div class="error">
                <strong>오류 발생:</strong> ${error.message}<br>
                <small>
                    가능한 해결 방법:<br>
                    1. Google Sheets 파일이 공개로 설정되어 있는지 확인<br>
                    2. 시트 이름이 "제주 공항근처"인지 확인<br>
                    3. 브라우저 콘솔(F12)에서 자세한 오류 확인<br>
                    4. 네트워크 연결 확인
                </small>
            </div>
        `;
    } finally {
        loadBtn.disabled = false;
        loadBtn.textContent = '데이터 불러오기';
    }
}

// CSV 파싱 함수
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    // 헤더 파싱
    const headers = parseCSVLine(lines[0]);
    
    // 데이터 파싱
    const restaurants = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        if (values.length < headers.length) continue;
        
        // 위도, 경도가 있는 경우만 추가
        const latIndex = headers.findIndex(h => h.toLowerCase().includes('latitude') || h === 'Latitude');
        const lngIndex = headers.findIndex(h => h.toLowerCase().includes('longitude') || h === 'Longitude');
        
        if (latIndex === -1 || lngIndex === -1) continue;
        
        const lat = parseFloat(values[latIndex]);
        const lng = parseFloat(values[lngIndex]);
        
        if (isNaN(lat) || isNaN(lng)) continue;
        
        // 데이터 객체 생성
        const revenueValue = getValueByHeader(headers, values, '빅밸류 추정 연 매출') || '';
        // 매출 값에서 쉼표 제거 및 정리
        const cleanedRevenue = revenueValue ? String(revenueValue).replace(/,/g, '').trim() : '';
        
        const restaurant = {
            category: getValueByHeader(headers, values, '구분') || '기타',
            businessNumber: getValueByHeader(headers, values, '사업자 등록 번호') || '',
            name: getValueByHeader(headers, values, '상호명') || '이름 없음',
            annualRevenue: cleanedRevenue,
            area: getValueByHeader(headers, values, '빅밸류 추정 임대면적') || '',
            operatingPeriod: getValueByHeader(headers, values, '운영기간') || '',
            openDate: getValueByHeader(headers, values, '개업일자') || '',
            address: getValueByHeader(headers, values, '지번주소') || '',
            latitude: lat,
            longitude: lng,
            franchise: getValueByHeader(headers, values, '프랜차이즈여부') || ''
        };
        
        restaurants.push(restaurant);
    }
    
    return restaurants;
}

// CSV 라인 파싱 (쉼표와 따옴표 처리)
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    
    return values;
}

// 헤더 이름으로 값 가져오기
function getValueByHeader(headers, values, headerName) {
    const index = headers.findIndex(h => h.includes(headerName));
    return index !== -1 ? values[index] : '';
}

// 매출 포맷팅 함수 (천원 단위를 읽기 쉬운 형식으로)
function formatRevenue(revenue) {
    if (!revenue || revenue === '' || revenue === 'undefined' || revenue === 'null') {
        return '정보 없음';
    }
    
    // 문자열에서 숫자만 추출 (쉼표 등 제거)
    const revenueStr = String(revenue).replace(/,/g, '').trim();
    const revenueNum = parseFloat(revenueStr);
    
    if (isNaN(revenueNum) || revenueNum === 0) {
        return '정보 없음';
    }
    
    // 천원 단위를 원 단위로 변환
    const revenueWon = revenueNum * 1000;
    
    // 1억 이상: 소수점 두자리로 억 단위
    if (revenueWon >= 100000000) {
        const eok = revenueWon / 100000000;
        return `${eok.toFixed(2)}억`;
    }
    // 1억 미만, 천만 이상: 소수점 없이 만 단위
    else if (revenueWon >= 10000000) {
        const man = Math.round(revenueWon / 10000);
        return `${man}만`;
    }
    // 천만 미만, 만 이상: 만 단위
    else if (revenueWon >= 10000) {
        const man = Math.round(revenueWon / 10000);
        return `${man}만`;
    }
    // 만 미만: 천원 단위
    else {
        return `${Math.round(revenueWon / 1000)}천원`;
    }
}

// 1차원 K-means 클러스터링 (K=4)
function kmeans1D(data, k = 4, maxIterations = 100) {
    if (data.length === 0) {
        return [];
    }
    
    const n = data.length;
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    // 초기 중심점 선택 (균등 분포)
    let centroids = [];
    for (let i = 0; i < k; i++) {
        centroids.push(min + (max - min) * (i + 1) / (k + 1));
    }
    
    let clusters = [];
    let iterations = 0;
    
    while (iterations < maxIterations) {
        // 각 데이터 포인트를 가장 가까운 중심점에 할당
        clusters = Array(k).fill(null).map(() => []);
        
        data.forEach(value => {
            let minDistance = Infinity;
            let closestCluster = 0;
            
            centroids.forEach((centroid, idx) => {
                const distance = Math.abs(value - centroid);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCluster = idx;
                }
            });
            
            clusters[closestCluster].push(value);
        });
        
        // 새로운 중심점 계산 (각 클러스터의 평균)
        let newCentroids = [];
        let converged = true;
        
        clusters.forEach((cluster, idx) => {
            if (cluster.length === 0) {
                // 빈 클러스터는 이전 중심점 유지
                newCentroids.push(centroids[idx]);
            } else {
                const mean = cluster.reduce((sum, val) => sum + val, 0) / cluster.length;
                newCentroids.push(mean);
                
                // 수렴 확인
                if (Math.abs(centroids[idx] - mean) > 0.001) {
                    converged = false;
                }
            }
        });
        
        if (converged) {
            break;
        }
        
        centroids = newCentroids;
        iterations++;
    }
    
    return clusters;
}

// 4분위 계산 함수 (K-means 클러스터링 사용)
function calculateQuartiles(revenues) {
    // 매출이 있는 것만 필터링
    const validRevenues = revenues
        .map(r => r ? parseFloat(r) : 0)
        .filter(r => r > 0);
    
    if (validRevenues.length === 0) {
        return { q1: 0, q2: 0, q3: 0, q4: 0 };
    }
    
    if (validRevenues.length < 4) {
        // 데이터가 4개 미만이면 단순 정렬로 처리
        const sorted = [...validRevenues].sort((a, b) => a - b);
        return {
            q1: sorted[0] || 0,
            q2: sorted[Math.floor(sorted.length / 2)] || 0,
            q3: sorted[sorted.length - 1] || 0,
            q4: sorted[sorted.length - 1] || 0
        };
    }
    
    // K-means 클러스터링 (K=4)
    const clusters = kmeans1D(validRevenues, 4);
    
    // 각 클러스터를 정렬하고 최소/최대값 찾기
    const clusterRanges = clusters
        .map(cluster => {
            if (cluster.length === 0) return null;
            const sorted = [...cluster].sort((a, b) => a - b);
            return {
                min: sorted[0],
                max: sorted[sorted.length - 1],
                mean: cluster.reduce((sum, val) => sum + val, 0) / cluster.length
            };
        })
        .filter(range => range !== null)
        .sort((a, b) => a.mean - b.mean); // 평균값 기준으로 정렬
    
    // 각 클러스터의 최대값을 분위 경계로 사용
    // 클러스터를 평균값 기준으로 정렬했으므로 순서대로 q1, q2, q3, q4
    const boundaries = [];
    for (let i = 0; i < clusterRanges.length - 1; i++) {
        // 클러스터 간 경계: 이전 클러스터의 최대값과 다음 클러스터의 최소값의 평균
        const boundary = (clusterRanges[i].max + clusterRanges[i + 1].min) / 2;
        boundaries.push(boundary);
    }
    
    const max = Math.max(...validRevenues);
    
    return {
        q1: boundaries[0] || clusterRanges[0]?.max || 0,
        q2: boundaries[1] || clusterRanges[1]?.max || 0,
        q3: boundaries[2] || clusterRanges[2]?.max || 0,
        q4: max
    };
}

// 매출에 따라 마커 색상 결정 (4분위 기반)
function getMarkerColorByRevenue(revenue, quartiles) {
    const revenueNum = revenue ? parseFloat(revenue) : 0;
    
    if (revenueNum === 0) {
        return '#CCCCCC'; // 회색 - 매출 정보 없음
    }
    
    // 4분위에 따라 색상 결정
    if (revenueNum <= quartiles.q1) {
        return '#999999'; // 회색 - 1분위 (가장 낮은 분위)
    } else if (revenueNum <= quartiles.q2) {
        return '#FFD700'; // 노란색 - 2분위
    } else if (revenueNum <= quartiles.q3) {
        return '#FF4500'; // 붉은색 - 3분위
    } else {
        return '#0066FF'; // 파란색 - 4분위 (가장 높은 분위)
    }
}

// 매출에 따라 마커 아이콘 생성 (4분위 기반)
function createRevenueMarkerIcon(revenue, quartiles) {
    const color = getMarkerColorByRevenue(revenue, quartiles);
    const size = 32; // 모든 마커 동일한 크기
    
    // SVG로 동적 마커 생성
    const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="white" stroke-width="2"/>
        </svg>
    `;
    
    return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(size, size),
        anchor: new google.maps.Point(size/2, size/2)
    };
}

// 클러스터 스타일 생성 (매출 합계에 따라)
function getClusterStyle(count, totalRevenue) {
    const avgRevenue = totalRevenue / count;
    
    let color = '#999999';
    let size = 40;
    
    if (avgRevenue >= 500000) {
        color = '#FF0000'; // 빨간색
        size = 60;
    } else if (avgRevenue >= 200000) {
        color = '#FF6600'; // 주황색
        size = 55;
    } else if (avgRevenue >= 100000) {
        color = '#FFAA00'; // 노란색
        size = 50;
    } else if (avgRevenue >= 50000) {
        color = '#00AA00'; // 초록색
        size = 45;
    } else {
        color = '#0066FF'; // 파란색
        size = 40;
    }
    
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
                <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="white" stroke-width="3" opacity="0.8"/>
                <text x="${size/2}" y="${size/2 + 5}" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">${count}</text>
            </svg>
        `)}`,
        scaledSize: new google.maps.Size(size, size),
        anchor: new google.maps.Point(size/2, size/2)
    };
}

// 제주도 범위 확인 함수
function isInJejuBounds(lat, lng) {
    // 제주도 대략적인 경계
    // 위도: 33.1 ~ 33.6
    // 경도: 126.1 ~ 126.9
    return lat >= 33.1 && lat <= 33.6 && lng >= 126.1 && lng <= 126.9;
}

// 현재 위치 찾기 함수
function findMyLocation() {
    const btn = document.getElementById('myLocationBtn');
    if (!btn) return;
    
    btn.disabled = true;
    btn.style.opacity = '0.6';
    
    if (!navigator.geolocation) {
        alert('브라우저가 위치 정보를 지원하지 않습니다.');
        btn.disabled = false;
        btn.style.opacity = '1';
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            // 제주도 범위 내에 있는지 확인
            if (isInJejuBounds(userLat, userLng)) {
                // 제주도 내에 있으면 사용자 위치로 이동
                map.setCenter({ lat: userLat, lng: userLng });
                map.setZoom(16);
                console.log('현재 위치로 이동:', userLat, userLng);
            } else {
                // 제주도 밖에 있으면 제주 공항으로 이동
                const jejuAirport = { lat: 33.5113, lng: 126.4930 };
                map.setCenter(jejuAirport);
                map.setZoom(14);
                alert('제주도 범위 밖입니다. 제주 공항으로 이동합니다.');
            }
            
            btn.disabled = false;
            btn.style.opacity = '1';
        },
        (error) => {
            console.error('위치 정보를 가져올 수 없습니다:', error);
            let errorMessage = '위치 정보를 가져올 수 없습니다.';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = '위치 정보를 사용할 수 없습니다.';
                    break;
                case error.TIMEOUT:
                    errorMessage = '위치 정보 요청 시간이 초과되었습니다.';
                    break;
            }
            alert(errorMessage);
            btn.disabled = false;
            btn.style.opacity = '1';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// 사용자 위치 가져오기 및 지도 초기화
function initMap() {
    // 제주 공항 좌표 (기본값)
    const jejuAirport = { lat: 33.5113, lng: 126.4930 };
    
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: jejuAirport, // 임시로 제주 공항 설정
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        gestureHandling: 'greedy', // 한 손가락으로 지도 이동 가능 (모바일 편의성 향상)
        disableDoubleClickZoom: false, // 더블클릭 줌 활성화
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    });
    
    // 사용자 위치 가져오기 시도
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                // 제주도 범위 내에 있는지 확인
                if (isInJejuBounds(userLat, userLng)) {
                    // 제주도 내에 있으면 사용자 위치로 설정
                    map.setCenter({ lat: userLat, lng: userLng });
                    console.log('사용자 위치로 지도 설정:', userLat, userLng);
                } else {
                    // 제주도 밖에 있으면 제주 공항으로 설정
                    map.setCenter(jejuAirport);
                    console.log('제주도 범위 밖이므로 제주 공항으로 설정');
                }
            },
            (error) => {
                // 위치 가져오기 실패 시 제주 공항으로 설정
                console.warn('위치 정보를 가져올 수 없습니다:', error.message);
                map.setCenter(jejuAirport);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        // Geolocation을 지원하지 않는 경우 제주 공항으로 설정
        console.warn('브라우저가 위치 정보를 지원하지 않습니다.');
        map.setCenter(jejuAirport);
    }
    
    // 데이터 불러오기 버튼 이벤트
    document.getElementById('loadDataBtn').addEventListener('click', loadRestaurantData);
    
    // 현재 위치 찾기 버튼 이벤트
    const myLocationBtn = document.getElementById('myLocationBtn');
    if (myLocationBtn) {
        myLocationBtn.addEventListener('click', findMyLocation);
    }
    
    // 지도 이동/줌 변경 시 4분위 업데이트
    let updateTimeout;
    map.addListener('bounds_changed', () => {
        // 디바운싱: 빠른 연속 호출 방지
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            updateMarkersByVisibleBounds();
        }, 300);
    });
    
    map.addListener('idle', () => {
        // 지도가 완전히 멈췄을 때 업데이트
        updateMarkersByVisibleBounds();
    });
    
    // 모바일에서 지도 리사이즈 처리
    if (window.innerWidth <= 768) {
        // 초기 리사이즈
        setTimeout(() => {
            if (map) {
                google.maps.event.trigger(map, 'resize');
            }
        }, 100);
        
        // 브라우저 주소창 높이 변화 대응
        let lastHeight = window.innerHeight;
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            if (Math.abs(currentHeight - lastHeight) > 50) {
                // 주소창 표시/숨김으로 인한 높이 변화
                setTimeout(() => {
                    if (map) {
                        google.maps.event.trigger(map, 'resize');
                    }
                }, 100);
                lastHeight = currentHeight;
            }
        });
        
        // 스크롤 시 주소창 숨김 대응
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (map) {
                        google.maps.event.trigger(map, 'resize');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
    }
    
    // 정보 패널 접기/펼치기 기능 (데스크톱 및 모바일)
    const infoPanel = document.getElementById('infoPanel');
    const infoPanelTitle = infoPanel?.querySelector('h3');
    
    if (infoPanelTitle) {
        // 클릭 이벤트 (데스크톱 및 모바일)
        infoPanelTitle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            infoPanel.classList.toggle('collapsed');
        });
        
        // 터치 이벤트 (모바일)
        if (window.innerWidth <= 768) {
            infoPanelTitle.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, { passive: false });
            
            infoPanelTitle.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                infoPanel.classList.toggle('collapsed');
            }, { passive: false });
        }
    }
    
    // 모바일에서 정보 패널 전체에서 지도 제스처 차단
    if (window.innerWidth <= 768 && infoPanel) {
        infoPanel.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: true });
        
        infoPanel.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });
        
        infoPanel.addEventListener('touchend', (e) => {
            e.stopPropagation();
        }, { passive: true });
    }
}

// 음식점들을 지도에 표시 (초기 로드)
function displayRestaurants(restaurants) {
    const bounds = new google.maps.LatLngBounds();
    
    markers = [];
    infoWindows = [];
    
    restaurants.forEach((restaurant, index) => {
        const position = {
            lat: restaurant.latitude,
            lng: restaurant.longitude
        };
        
        // 초기 아이콘 (나중에 업데이트됨)
        const icon = createRevenueMarkerIcon(restaurant.annualRevenue, { q1: 0, q2: 0, q3: 0, q4: 0 });
        
        // 마커 생성
        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: `${restaurant.name} (매출: ${formatRevenue(restaurant.annualRevenue)})`,
            icon: icon,
            restaurant: restaurant // 마커에 음식점 데이터 저장
        });
        
        // 정보창 생성
        const infoWindow = new google.maps.InfoWindow({
            content: createInfoWindowContent(restaurant)
        });
        
        // 마커 클릭 이벤트
        marker.addListener('click', () => {
            // 다른 정보창 닫기
            infoWindows.forEach(iw => iw.close());
            infoWindow.open(map, marker);
        });
        
        markers.push(marker);
        infoWindows.push(infoWindow);
        bounds.extend(position);
    });
    
    // 모든 마커가 보이도록 지도 조정
    if (restaurants.length > 0) {
        map.fitBounds(bounds);
    }
    
    // 초기 4분위 업데이트
    updateMarkersByVisibleBounds();
}

// 현재 보이는 영역의 마커들만 필터링하고 4분위 업데이트
function updateMarkersByVisibleBounds() {
    if (!map || !markers || markers.length === 0) {
        return;
    }
    
    const bounds = map.getBounds();
    if (!bounds) {
        return;
    }
    
    // 현재 맵에 보이는 마커들만 필터링
    const visibleMarkers = markers.filter(marker => {
        const position = marker.getPosition();
        return bounds.contains(position);
    });
    
    // 보이는 음식점 데이터 추출 (매출 데이터가 없는 것도 포함)
    const visibleRestaurants = visibleMarkers
        .map(marker => marker.restaurant)
        .filter(restaurant => restaurant); // null 제거
    
    // 보이는 음식점이 없으면 정보 패널 업데이트 후 종료
    if (visibleRestaurants.length === 0) {
        const restaurantInfo = document.getElementById('restaurantInfo');
        if (restaurantInfo) {
            restaurantInfo.innerHTML = '<div class="loading">현재 보이는 영역에 음식점이 없습니다.</div>';
        }
        return;
    }
    
    // 보이는 마커들의 매출 데이터 추출
    const visibleRevenues = visibleMarkers
        .map(marker => marker.restaurant?.annualRevenue)
        .filter(r => r && parseFloat(r) > 0);
    
    // 매출 데이터가 있는 음식점이 없어도 정보 패널은 업데이트
    if (visibleRevenues.length === 0) {
        console.log('보이는 영역에 매출 데이터가 있는 음식점이 없습니다.');
        // 매출 데이터가 없어도 음식점 목록은 표시 (매출 내림차순 정렬)
        displayRestaurantInfo(visibleRestaurants);
        return;
    }
    
    // 4분위 계산
    const quartiles = calculateQuartiles(visibleRevenues);
    
    console.log(`현재 보이는 ${visibleMarkers.length}개 음식점의 4분위 계산 결과:`, {
        q1: formatRevenue(quartiles.q1.toString()),
        q2: formatRevenue(quartiles.q2.toString()),
        q3: formatRevenue(quartiles.q3.toString()),
        q4: formatRevenue(quartiles.q4.toString())
    });
    
    // 각 분위에 속하는 음식점 개수 계산
    const q1Count = visibleRevenues.filter(r => {
        const rev = parseFloat(r);
        return rev > 0 && rev <= quartiles.q1;
    }).length;
    
    const q2Count = visibleRevenues.filter(r => {
        const rev = parseFloat(r);
        return rev > quartiles.q1 && rev <= quartiles.q2;
    }).length;
    
    const q3Count = visibleRevenues.filter(r => {
        const rev = parseFloat(r);
        return rev > quartiles.q2 && rev <= quartiles.q3;
    }).length;
    
    const q4Count = visibleRevenues.filter(r => {
        const rev = parseFloat(r);
        return rev > quartiles.q3;
    }).length;
    
    const totalCount = visibleRevenues.length;
    
    // 매출을 정렬하여 각 세그먼트 경계에 해당하는 매출 값 찾기
    const sortedRevenues = visibleRevenues
        .map(r => parseFloat(r))
        .filter(r => r > 0)
        .sort((a, b) => a - b);
    
    // 각 세그먼트 경계 위치의 매출 값 계산
    const getRevenueAtPosition = (position) => {
        if (sortedRevenues.length === 0) return 0;
        const index = Math.floor((position / 100) * sortedRevenues.length);
        return sortedRevenues[Math.min(index, sortedRevenues.length - 1)];
    };
    
    // 바의 각 세그먼트 경계 위치 계산 (음식점 개수 비율 기준)
    const q1Percent = totalCount > 0 ? (q1Count / totalCount) * 100 : 25;
    const q2Percent = totalCount > 0 ? (q2Count / totalCount) * 100 : 25;
    const q3Percent = totalCount > 0 ? (q3Count / totalCount) * 100 : 25;
    const q4Percent = totalCount > 0 ? (q4Count / totalCount) * 100 : 25;
    
    // 각 경계선 위치의 매출 값
    const boundary1Revenue = getRevenueAtPosition(q1Percent); // 회색-노란색 경계
    const boundary2Revenue = getRevenueAtPosition(q1Percent + q2Percent); // 노란색-빨간색 경계
    const boundary3Revenue = getRevenueAtPosition(q1Percent + q2Percent + q3Percent); // 빨간색-파란색 경계
    const minRevenue = sortedRevenues.length > 0 ? sortedRevenues[0] : 0;
    const maxRevenue = sortedRevenues.length > 0 ? sortedRevenues[sortedRevenues.length - 1] : quartiles.q4;
    
    // 범례 업데이트 (음식점 개수 비율 및 경계선 매출 값 포함)
    updateLegend(quartiles, {
        q1: q1Count,
        q2: q2Count,
        q3: q3Count,
        q4: q4Count,
        total: totalCount,
        boundaries: {
            q1Percent: q1Percent,
            q2Percent: q2Percent,
            q3Percent: q3Percent,
            q4Percent: q4Percent,
            boundary1: boundary1Revenue,
            boundary2: boundary2Revenue,
            boundary3: boundary3Revenue,
            min: minRevenue,
            max: maxRevenue
        }
    });
    
    // 모든 마커의 색상 업데이트 (보이는 것만이 아니라 전체)
    markers.forEach(marker => {
        const revenue = marker.restaurant?.annualRevenue;
        const newIcon = createRevenueMarkerIcon(revenue, quartiles);
        marker.setIcon(newIcon);
    });
    
    // 보이는 음식점만 정보 패널에 표시 (매출 내림차순)
    // visibleRestaurants는 이미 위에서 정의됨
    displayRestaurantInfo(visibleRestaurants);
}

// 범례 업데이트 함수 (바 형태)
function updateLegend(quartiles, counts = null) {
    const legendElement = document.querySelector('.legend');
    if (legendElement) {
        // 음식점 개수 비율 계산
        let q1Percent = 25, q2Percent = 25, q3Percent = 25, q4Percent = 25;
        let boundary1Revenue = quartiles.q1;
        let boundary2Revenue = quartiles.q2;
        let boundary3Revenue = quartiles.q3;
        let minRevenue = 0;
        let maxRevenue = quartiles.q4;
        
        if (counts && counts.boundaries) {
            q1Percent = counts.boundaries.q1Percent;
            q2Percent = counts.boundaries.q2Percent;
            q3Percent = counts.boundaries.q3Percent;
            q4Percent = counts.boundaries.q4Percent;
            boundary1Revenue = counts.boundaries.boundary1;
            boundary2Revenue = counts.boundaries.boundary2;
            boundary3Revenue = counts.boundaries.boundary3;
            minRevenue = counts.boundaries.min;
            maxRevenue = counts.boundaries.max;
        } else if (counts && counts.total > 0) {
            q1Percent = (counts.q1 / counts.total) * 100;
            q2Percent = (counts.q2 / counts.total) * 100;
            q3Percent = (counts.q3 / counts.total) * 100;
            q4Percent = (counts.q4 / counts.total) * 100;
        }
        
        // 경계선 위치 계산 (바의 세그먼트 경계에 맞춤)
        const boundary1Position = q1Percent; // 회색-노란색 경계
        const boundary2Position = q1Percent + q2Percent; // 노란색-빨간색 경계
        const boundary3Position = q1Percent + q2Percent + q3Percent; // 빨간색-파란색 경계
        
        // 매출 값 포맷팅
        const minFormatted = formatRevenue(minRevenue.toString());
        const boundary1Formatted = formatRevenue(boundary1Revenue.toString());
        const boundary2Formatted = formatRevenue(boundary2Revenue.toString());
        const boundary3Formatted = formatRevenue(boundary3Revenue.toString());
        const maxFormatted = formatRevenue(maxRevenue.toString());
        
        // 마커 위치 배열 생성
        const markerPositions = [
            { position: 0, label: minFormatted },
            { position: boundary1Position, label: boundary1Formatted },
            { position: boundary2Position, label: boundary2Formatted },
            { position: boundary3Position, label: boundary3Formatted },
            { position: 100, label: maxFormatted }
        ];
        
        // 바의 실제 너비 (max-width: 600px)
        const BAR_WIDTH_PX = 600;
        
        // 레이블 텍스트 너비 계산 함수 (0.75em ≈ 12px 기준)
        const FONT_SIZE_PX = 12; // 0.75em ≈ 12px
        const CHAR_WIDTH_PX = 7.5; // 한 글자당 대략 7.5px (12px 폰트 기준)
        
        const getLabelWidth = (text) => {
            // 실제 텍스트 길이를 기반으로 계산
            return text.length * CHAR_WIDTH_PX;
        };
        
        // 각 마커의 픽셀 위치와 레이블 너비 계산
        const markerInfo = markerPositions.map(marker => {
            // 바의 크기 기준 비율로 역산하여 픽셀 위치 계산
            const leftPx = (marker.position / 100) * BAR_WIDTH_PX;
            const labelWidth = getLabelWidth(marker.label);
            return {
                ...marker,
                leftPx: leftPx,
                labelWidth: labelWidth,
                leftEdge: leftPx - labelWidth / 2, // 레이블 왼쪽 끝
                rightEdge: leftPx + labelWidth / 2  // 레이블 오른쪽 끝
            };
        });
        
        // 겹침 감지 및 배치 결정
        const markerPlacements = [];
        const lineHeights = []; // 각 마커의 줄 길이
        
        for (let i = 0; i < markerInfo.length; i++) {
            const current = markerInfo[i];
            let placement = 'top'; // 기본값: 위쪽
            let lineHeight = 'short'; // 기본값: 짧은 줄
            
            // 이전 마커와의 겹침 확인
            if (i > 0) {
                const prev = markerInfo[i - 1];
                const prevPlacement = markerPlacements[i - 1];
                
                // 레이블이 겹치는지 확인 (픽셀 단위)
                if (current.leftEdge < prev.rightEdge) {
                    // 겹침 발생
                    // 앞의 글씨가 아래(bottom)에 있다면 → 현재는 위(top)
                    // 앞의 글씨가 위(top)에 있다면 → 현재는 아래(bottom)
                    if (prevPlacement === 'bottom') {
                        placement = 'top'; // 앞의 글씨가 아래에 있으면 정상 위치(위)로 출력
                    } else {
                        placement = 'bottom'; // 앞의 글씨가 위에 있으면 내려서(아래) 출력
                    }
                    lineHeight = 'long'; // 겹칠 경우 긴 줄 사용
                }
            }
            
            markerPlacements.push(placement);
            lineHeights.push(lineHeight);
        }
        
        // 마커 HTML 생성
        const markersHTML = markerPositions.map((marker, index) => {
            const placement = markerPlacements[index];
            const lineHeight = lineHeights[index];
            const markerClass = `legend-marker legend-marker-${placement}`;
            
            // 줄 길이 결정: 겹칠 경우 더 긴 줄 사용
            let lineClass = 'legend-marker-line';
            if (lineHeight === 'long') {
                lineClass += ' long-line';
            } else if (placement === 'top') {
                lineClass += ' short-line';
            } else {
                lineClass += ' long-line';
            }
            
            const labelClass = placement === 'top' ? 'legend-marker-label label-top' : 'legend-marker-label label-bottom';
            
            return `
                <div class="${markerClass}" style="left: ${marker.position}%;">
                    <div class="${lineClass}"></div>
                    <div class="${labelClass}">${marker.label}</div>
                </div>
            `;
        }).join('');
        
        legendElement.innerHTML = `
            <div class="legend-content">
                <span class="legend-title">매출 4분위 범례 (현재 보이는 ${counts ? counts.total : 0}개 음식점):</span>
                <div class="legend-bar-container">
                    <div class="legend-bar-wrapper" style="width: 100%; max-width: 600px;">
                        <div class="legend-bar" style="width: 100%;">
                            <div class="legend-bar-segment" style="width: ${q1Percent}%; background: #999999;" title="1분위: ${counts ? counts.q1 : 0}개 (${Math.round(q1Percent)}%)"></div>
                            <div class="legend-bar-segment" style="width: ${q2Percent}%; background: #FFD700;" title="2분위: ${counts ? counts.q2 : 0}개 (${Math.round(q2Percent)}%)"></div>
                            <div class="legend-bar-segment" style="width: ${q3Percent}%; background: #FF4500;" title="3분위: ${counts ? counts.q3 : 0}개 (${Math.round(q3Percent)}%)"></div>
                            <div class="legend-bar-segment" style="width: ${q4Percent}%; background: #0066FF;" title="4분위: ${counts ? counts.q4 : 0}개 (${Math.round(q4Percent)}%)"></div>
                        </div>
                        <div class="legend-markers">
                            ${markersHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// 클립보드에 텍스트 복사 함수
async function copyToClipboard(text, label) {
    try {
        await navigator.clipboard.writeText(text);
        // 간단한 피드백 (선택사항)
        const toast = document.createElement('div');
        toast.textContent = `${label} 복사됨: ${text}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    } catch (err) {
        console.error('복사 실패:', err);
        alert(`${label} 복사 실패: ${text}`);
    }
}

// HTML 이스케이프 처리 함수
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// JavaScript 문자열 이스케이프 처리 (onclick 속성용)
function escapeJsString(text) {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

// 정보창 내용 생성
function createInfoWindowContent(restaurant) {
    const revenue = formatRevenue(restaurant.annualRevenue);
    const area = restaurant.area ? `${restaurant.area}㎡` : '정보 없음';
    const restaurantName = restaurant.name || '정보 없음';
    const restaurantAddress = restaurant.address || '정보 없음';
    
    // 복사용 데이터 (이스케이프 처리)
    const nameForCopy = escapeJsString(restaurantName);
    const addressForCopy = escapeJsString(restaurantAddress);
    
    return `
        <div style="padding: 10px; min-width: 250px;" id="info-window-${restaurant.businessNumber || Math.random()}">
            <h3 style="margin: 0 0 10px 0; color: #667eea; font-size: 1.2em; cursor: pointer; user-select: none;" 
                onclick="window.copyToClipboard('${nameForCopy}', '이름')"
                onmouseover="this.style.textDecoration='underline'; this.style.color='#5568d3';"
                onmouseout="this.style.textDecoration='none'; this.style.color='#667eea';"
                title="클릭하여 이름 복사">${escapeHtml(restaurantName)}</h3>
            <div style="margin-bottom: 8px;">
                <span style="background: #e3e8ff; color: #667eea; padding: 4px 10px; border-radius: 12px; font-size: 0.85em;">
                    ${escapeHtml(restaurant.category)}
                </span>
            </div>
            <div style="margin: 5px 0; font-size: 0.9em;">
                <strong>주소:</strong> 
                <span style="cursor: pointer; user-select: none; color: #667eea; text-decoration: underline;"
                      onclick="window.copyToClipboard('${addressForCopy}', '주소')"
                      onmouseover="this.style.color='#5568d3';"
                      onmouseout="this.style.color='#667eea';"
                      title="클릭하여 주소 복사">${escapeHtml(restaurantAddress)}</span><br>
                <strong>연 매출:</strong> ${revenue}<br>
                <strong>면적:</strong> ${area}<br>
                <strong>운영기간:</strong> ${restaurant.operatingPeriod || '정보 없음'}<br>
                <strong>개업일:</strong> ${restaurant.openDate || '정보 없음'}<br>
                <strong>프랜차이즈:</strong> ${restaurant.franchise || '정보 없음'}
            </div>
            <button onclick="window.searchOnNaver('${nameForCopy}', '${addressForCopy}');" 
                    style="margin-top: 10px; padding: 8px 16px; background: linear-gradient(135deg, #03C75A 0%, #02B350 100%); color: white; border: none; border-radius: 6px; font-size: 0.9em; font-weight: 600; cursor: pointer; width: 100%; transition: transform 0.2s, box-shadow 0.2s;"
                    onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(3, 199, 90, 0.3)';"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"
                    title="네이버에서 검색">🔍 검색하기</button>
        </div>
    `;
}

// 정보 패널에 음식점 정보 표시
function displayRestaurantInfo(restaurants) {
    const restaurantInfo = document.getElementById('restaurantInfo');
    
    if (restaurants.length === 0) {
        restaurantInfo.innerHTML = '<div class="loading">표시할 음식점이 없습니다.</div>';
        return;
    }
    
    // 매출 내림차순 정렬
    const sortedRestaurants = [...restaurants].sort((a, b) => {
        const revenueA = parseFloat(a.annualRevenue) || 0;
        const revenueB = parseFloat(b.annualRevenue) || 0;
        return revenueB - revenueA; // 내림차순
    });
    
    restaurantInfo.innerHTML = sortedRestaurants.map((restaurant, index) => {
        const revenue = formatRevenue(restaurant.annualRevenue);
        const area = restaurant.area ? `${restaurant.area}㎡` : '정보 없음';
        const restaurantName = restaurant.name || '정보 없음';
        const restaurantAddress = restaurant.address || '정보 없음';
        
        return `
            <div class="restaurant-card" data-index="${index}">
                <h4 class="copyable-name" data-text="${restaurantName.replace(/"/g, '&quot;')}" title="클릭하여 이름 복사">${restaurantName}</h4>
                <span class="category">${restaurant.category}</span>
                <div class="detail">
                    <strong>주소:</strong> 
                    <span class="copyable-address" data-text="${restaurantAddress.replace(/"/g, '&quot;')}" title="클릭하여 주소 복사">${restaurantAddress}</span>
                </div>
                <div class="detail"><strong>연 매출:</strong> ${revenue}</div>
                <div class="detail"><strong>면적:</strong> ${area}</div>
                <div class="detail"><strong>운영기간:</strong> ${restaurant.operatingPeriod || '정보 없음'}</div>
                <div class="detail"><strong>개업일:</strong> ${restaurant.openDate || '정보 없음'}</div>
                <button class="search-btn" data-name="${restaurantName.replace(/"/g, '&quot;')}" data-address="${restaurantAddress.replace(/"/g, '&quot;')}" title="네이버에서 검색">🔍 검색하기</button>
            </div>
        `;
    }).join('');
    
    // 카드 클릭 시 해당 마커의 정보창 열기 (이름/주소 클릭 시에는 복사만)
    // 정렬된 배열에서 원본 인덱스 찾기
    restaurantInfo.querySelectorAll('.restaurant-card').forEach((card, sortedIndex) => {
        const restaurant = sortedRestaurants[sortedIndex];
        // 전체 음식점 데이터 배열(restaurantsData)에서 해당 음식점의 인덱스 찾기
        const originalIndex = restaurantsData.findIndex(r => 
            r.name === restaurant.name && 
            r.address === restaurant.address &&
            Math.abs(r.latitude - restaurant.latitude) < 0.0001 &&
            Math.abs(r.longitude - restaurant.longitude) < 0.0001
        );
        
        // 이름 클릭 시 복사
        const nameElement = card.querySelector('.copyable-name');
        if (nameElement) {
            nameElement.addEventListener('click', (e) => {
                e.stopPropagation(); // 카드 클릭 이벤트 방지
                const text = nameElement.getAttribute('data-text');
                copyToClipboard(text, '이름');
            });
        }
        
        // 주소 클릭 시 복사
        const addressElement = card.querySelector('.copyable-address');
        if (addressElement) {
            addressElement.addEventListener('click', (e) => {
                e.stopPropagation(); // 카드 클릭 이벤트 방지
                const text = addressElement.getAttribute('data-text');
                copyToClipboard(text, '주소');
            });
        }
        
        // 검색 버튼 클릭 시 네이버 검색
        const searchBtn = card.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 카드 클릭 이벤트 방지
                const name = searchBtn.getAttribute('data-name');
                const address = searchBtn.getAttribute('data-address');
                searchOnNaver(name, address);
            });
        }
        
        // 카드 클릭 시 해당 마커의 정보창 열기 (이름/주소/검색 버튼이 아닌 다른 부분 클릭 시)
        card.addEventListener('click', (e) => {
            // 이름, 주소, 검색 버튼을 클릭한 경우는 제외
            if (e.target.classList.contains('copyable-name') || 
                e.target.classList.contains('copyable-address') || 
                e.target.classList.contains('search-btn')) {
                return;
            }
            if (originalIndex >= 0 && originalIndex < markers.length && markers[originalIndex]) {
                infoWindows.forEach(iw => iw.close());
                infoWindows[originalIndex].open(map, markers[originalIndex]);
                map.setCenter(markers[originalIndex].getPosition());
                map.setZoom(16);
            } else {
                console.warn('마커를 찾을 수 없습니다:', originalIndex, restaurant.name);
            }
        });
    });
}

// 기존 마커 제거
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    infoWindows.forEach(iw => iw.close());
    markers = [];
    infoWindows = [];
}

// 네이버 검색 함수
function searchOnNaver(name, address) {
    // 주소와 업소명을 조합하여 검색어 생성
    const searchQuery = address && name ? `${address} ${name}` : (name || address || '');
    if (!searchQuery) {
        alert('검색할 정보가 없습니다.');
        return;
    }
    
    // URL 인코딩
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // 네이버 검색 URL 생성
    const naverSearchUrl = `https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=${encodedQuery}`;
    
    // 새 창에서 열기
    window.open(naverSearchUrl, '_blank');
}

// 전역 함수로 복사 함수 및 검색 함수 노출 (InfoWindow에서 사용하기 위해)
window.copyToClipboard = copyToClipboard;
window.searchOnNaver = searchOnNaver;

// 페이지 로드 시 지도 초기화
// 주의: initMap은 Google Maps API가 로드된 후 callback으로 호출됩니다
// (index.html에서 Google Maps API 로드 시 callback=initGoogleMaps 설정)
// 따라서 여기서는 직접 호출하지 않습니다.

