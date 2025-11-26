// ============================================================
// [중요] 카카오 개발자 센터(https://developers.kakao.com)에서 발급받은
// [JavaScript 키]를 아래 변수에 넣어주세요!
// ============================================================
const KAKAO_API_KEY = 'f3007cbf6c053329c9f18df03c2b30e7'; 

let currentRestaurants = [];

// 위치 정보 캐싱 변수
let cachedLat = null;
let cachedLng = null;

// 카테고리별 검색 키워드 매핑
const categoryKeywords = {
    "한식": "한식",
    "중식": "중식",
    "일식": "일식",
    "양식": "양식"
};

function loadRestaurants(category) {
    // API 키 체크
    if (!KAKAO_API_KEY || KAKAO_API_KEY.includes('여기에')) {
        alert('script.js 파일을 열어서 [KAKAO_API_KEY] 변수에 키를 먼저 입력해주세요!');
        return;
    }

    const loadingEl = document.getElementById('loading');
    const resultContainer = document.getElementById('result-container');
    const listEl = document.getElementById('restaurant-list');
    const randomBtn = document.getElementById('random-btn');

    // 화면 초기화
    resultContainer.classList.add('hidden');
    randomBtn.classList.add('hidden');
    loadingEl.classList.remove('hidden');
    listEl.innerHTML = '';

    // 캐시된 위치가 있으면 바로 호출
    if (cachedLat && cachedLng) {
        console.log("캐시된 위치 사용:", cachedLat, cachedLng);
        searchPlacesWithSDK(cachedLat, cachedLng, categoryKeywords[category], category);
        return;
    }

    if (!navigator.geolocation) {
        alert('위치 정보를 지원하지 않는 브라우저입니다.');
        loadingEl.classList.add('hidden');
        return;
    }

    // 위치 정보가 없으면 새로 요청
    navigator.geolocation.getCurrentPosition(
        (position) => {
            cachedLat = position.coords.latitude;
            cachedLng = position.coords.longitude;
            console.log("새로운 위치 갱신:", cachedLat, cachedLng);
            
            searchPlacesWithSDK(cachedLat, cachedLng, categoryKeywords[category], category);
        },
        (error) => {
            console.error(error);
            alert('위치 권한이 필요합니다. 브라우저 설정에서 위치 권한을 허용해주세요.');
            loadingEl.classList.add('hidden');
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
}

function searchPlacesWithSDK(lat, lng, keyword, categoryName) {
    if (!window.kakao || !window.kakao.maps) {
        const script = document.createElement('script');
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services&autoload=false`;
        script.onload = () => {
            kakao.maps.load(() => {
                executeSearch(lat, lng, keyword, categoryName);
            });
        };
        script.onerror = () => {
            alert('카카오 지도 API 로드 실패! API 키나 도메인 설정을 확인해주세요.');
            document.getElementById('loading').classList.add('hidden');
        };
        document.head.appendChild(script);
    } else {
        executeSearch(lat, lng, keyword, categoryName);
    }
}

function executeSearch(lat, lng, keyword, categoryName) {
    const ps = new kakao.maps.services.Places();
    const loadingEl = document.getElementById('loading');
    const randomBtn = document.getElementById('random-btn');

    const options = {
        location: new kakao.maps.LatLng(lat, lng),
        radius: 1000, 
        sort: kakao.maps.services.SortBy.DISTANCE,
        size: 15 
    };

    ps.keywordSearch(keyword, (data, status, pagination) => {
        loadingEl.classList.add('hidden');

        if (status === kakao.maps.services.Status.OK) {
            // 1. API 결과 변환
            let apiRestaurants = data.map(place => ({
                id: place.id,
                name: place.place_name,
                category: categoryName, // 현재 선택한 카테고리명 사용
                distance: place.distance + 'm',
                address: place.road_address_name || place.address_name,
                url: place.place_url
            }));

            // 2. 데이터 병합 및 필터링 (핵심 로직)
            currentRestaurants = mergeAndFilterData(apiRestaurants, categoryName);

            // 3. 화면 표시
            displayRestaurants(currentRestaurants);
            
            if (currentRestaurants.length > 0) {
                randomBtn.classList.remove('hidden');
            }

        } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
            // 검색 결과가 없어도 저장된 식당은 보여줘야 함
            currentRestaurants = mergeAndFilterData([], categoryName);
            displayRestaurants(currentRestaurants);
            
            if (currentRestaurants.length > 0) {
                randomBtn.classList.remove('hidden');
            } else {
                alert('주변 1km 내에 해당 메뉴의 음식점이 없고, 저장된 식당도 없습니다 ㅠㅠ');
            }
        } else {
            alert('검색 중 오류가 발생했습니다.');
        }
    }, options);
}

// [NEW] 데이터 병합 및 필터링 로직
function mergeAndFilterData(apiData, categoryName) {
    const savedList = JSON.parse(localStorage.getItem('myRestaurants')) || [];
    const hiddenList = JSON.parse(localStorage.getItem('hiddenRestaurants')) || [];

    // 1. 제외 목록(Hidden)에 있는 식당 ID 추출
    const hiddenIds = new Set(hiddenList.map(item => item.id));

    // 2. API 데이터에서 제외된 식당 필터링
    let filteredApiData = apiData.filter(item => !hiddenIds.has(item.id));

    // 3. 저장된 식당 중 현재 카테고리와 맞는 것 가져오기 (제외된 것은 뺌)
    // 저장된 식당은 무조건 리스트 상단에 배치하거나 포함시켜야 함
    const savedInThisCategory = savedList.filter(item => 
        item.category === categoryName && !hiddenIds.has(item.id)
    );

    // 4. API 데이터 랜덤 섞기
    filteredApiData = filteredApiData.sort(() => 0.5 - Math.random());

    // 5. 중복 제거를 위해 Map 사용
    const finalMap = new Map();

    // 5-1. 저장된 식당 먼저 넣기 (우선순위)
    savedInThisCategory.forEach(item => finalMap.set(item.id, item));

    // 5-2. API 식당 채워넣기 (최대 15개까지)
    for (const item of filteredApiData) {
        if (finalMap.size >= 15) break;
        if (!finalMap.has(item.id)) {
            finalMap.set(item.id, item);
        }
    }

    // Map -> Array 변환
    return Array.from(finalMap.values());
}

function displayRestaurants(restaurants) {
    const resultContainer = document.getElementById('result-container');
    const listEl = document.getElementById('restaurant-list');
    const savedList = JSON.parse(localStorage.getItem('myRestaurants')) || [];
    const savedIds = new Set(savedList.map(p => p.id));

    if (restaurants.length === 0) {
        listEl.innerHTML = '<li class="restaurant-item">표시할 식당이 없습니다.</li>';
    } else {
        restaurants.forEach((place, index) => {
            const li = document.createElement('li');
            li.className = 'restaurant-item';
            if (savedIds.has(place.id)) {
                li.classList.add('saved-item'); // 저장된 아이템 스타일용 클래스
            }
            li.id = `item-${index}`;
            
            const isSaved = savedIds.has(place.id);
            const saveBtnText = isSaved ? "저장됨" : "저장";
            const saveBtnColor = isSaved ? "#ffd43b" : ""; // 노란색

            li.innerHTML = `
                <div class="restaurant-info" style="flex:1; width:100%;">
                    <div class="restaurant-name">
                        ${place.name} 
                        ${isSaved ? '<span style="font-size:0.8rem; color:#fcc419;">⭐</span>' : ''}
                    </div>
                    <div class="restaurant-meta">
                        <span>${place.category}</span> | 
                        <span>${place.distance}</span>
                    </div>
                    <div class="restaurant-address">${place.address}</div>
                </div>
                
                <div class="btn-group">
                    <a href="${place.url}" target="_blank" class="action-btn map-btn">지도</a>
                    <button class="action-btn save-btn" style="background-color:${saveBtnColor}" onclick="toggleSave('${place.id}')">${saveBtnText}</button>
                    <button class="action-btn hide-btn" onclick="hideRestaurant('${place.id}')">🚫 제외</button>
                </div>
            `;
            listEl.appendChild(li);
        });
    }

    resultContainer.classList.remove('hidden');
}

// =======================
// 저장/제외 기능
// =======================

// [수정] 저장 토글 기능 (저장 <-> 해제)
function toggleSave(placeId) {
    const place = currentRestaurants.find(p => p.id === placeId);
    if (!place) return; // 리스트에 없으면 패스

    let savedList = JSON.parse(localStorage.getItem('myRestaurants')) || [];
    const existingIndex = savedList.findIndex(p => p.id === placeId);

    if (existingIndex >= 0) {
        // 이미 있으면 삭제 (저장 취소)
        savedList.splice(existingIndex, 1);
        alert('저장이 취소되었습니다.');
    } else {
        // 없으면 추가
        savedList.push(place);
        alert(`"${place.name}" 저장 완료!`);
    }
    
    localStorage.setItem('myRestaurants', JSON.stringify(savedList));
    
    // 화면 갱신 (스타일 업데이트)
    displayRestaurants(currentRestaurants);
}

// [NEW] 식당 숨기기 (제외)
function hideRestaurant(placeId) {
    const place = currentRestaurants.find(p => p.id === placeId);
    if (!place && !confirm("목록에서 제외하시겠습니까?")) return;

    let hiddenList = JSON.parse(localStorage.getItem('hiddenRestaurants')) || [];
    
    // 중복 체크
    if (!hiddenList.some(h => h.id === placeId)) {
        hiddenList.push(place);
        localStorage.setItem('hiddenRestaurants', JSON.stringify(hiddenList));
    }

    // 현재 리스트에서 즉시 제거하고 화면 갱신
    currentRestaurants = currentRestaurants.filter(p => p.id !== placeId);
    displayRestaurants(currentRestaurants);
}

// 저장 목록 팝업
function openSavedList() {
    const modal = document.getElementById('saved-modal');
    const listEl = document.getElementById('saved-list');
    const savedList = JSON.parse(localStorage.getItem('myRestaurants')) || [];

    renderSimpleList(listEl, savedList, 'saved');
    modal.classList.remove('hidden');
}

// [NEW] 제외 목록 팝업
function openHiddenList() {
    const modal = document.getElementById('hidden-modal');
    const listEl = document.getElementById('hidden-list');
    const hiddenList = JSON.parse(localStorage.getItem('hiddenRestaurants')) || [];

    renderSimpleList(listEl, hiddenList, 'hidden');
    modal.classList.remove('hidden');
}

// 팝업 내부 리스트 렌더링 (재사용)
function renderSimpleList(container, list, type) {
    container.innerHTML = '';
    if (list.length === 0) {
        container.innerHTML = '<li style="padding:20px;">목록이 비어있습니다.</li>';
        return;
    }

    list.forEach((place) => {
        const li = document.createElement('li');
        li.className = 'restaurant-item'; 
        li.style.marginBottom = '10px';
        
        let btnHtml = '';
        if (type === 'saved') {
            btnHtml = `<button class="action-btn" style="background:#ff6b6b; color:white;" onclick="removeFromSaved('${place.id}')">삭제</button>`;
        } else {
            btnHtml = `<button class="action-btn" style="background:#51cf66; color:white;" onclick="restoreHidden('${place.id}')">복구</button>`;
        }

        li.innerHTML = `
            <div class="restaurant-name">${place.name}</div>
            <div class="restaurant-address">${place.address}</div>
            <div class="btn-group">
                <a href="${place.url}" target="_blank" class="action-btn map-btn">지도</a>
                ${btnHtml}
            </div>
        `;
        container.appendChild(li);
    });
}

// 저장 목록에서 제거
function removeFromSaved(placeId) {
    let savedList = JSON.parse(localStorage.getItem('myRestaurants')) || [];
    savedList = savedList.filter(p => p.id !== placeId);
    localStorage.setItem('myRestaurants', JSON.stringify(savedList));
    openSavedList(); // 리스트 갱신
    
    // 현재 화면에 떠있는 리스트에도 반영 (저장 마크 제거 등)
    displayRestaurants(currentRestaurants);
}

// 제외 목록에서 복구
function restoreHidden(placeId) {
    let hiddenList = JSON.parse(localStorage.getItem('hiddenRestaurants')) || [];
    hiddenList = hiddenList.filter(p => p.id !== placeId);
    localStorage.setItem('hiddenRestaurants', JSON.stringify(hiddenList));
    openHiddenList(); // 리스트 갱신
    
    // 주의: 현재 화면(currentRestaurants)에는 API를 다시 부르기 전까지는 추가되지 않음
}

function closeSavedList() {
    document.getElementById('saved-modal').classList.add('hidden');
}

function closeHiddenList() {
    document.getElementById('hidden-modal').classList.add('hidden');
}

// =======================
// 팝업 및 연출 닫기
// =======================
function closeWinnerModal() {
    document.getElementById('winner-modal').classList.add('hidden');
}

function showDrumroll(callback) {
    const modal = document.getElementById('drumroll-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('hidden');
        if (callback) callback();
    }, 3000);
}

// =======================
// 랜덤 추첨
// =======================
function startRandomSelection() {
    const items = document.querySelectorAll('#restaurant-list .restaurant-item');
    if (items.length === 0) return;

    const randomBtn = document.getElementById('random-btn');
    randomBtn.disabled = true;
    
    items.forEach(item => {
        item.classList.remove('active', 'selected');
    });

    selectFinalWinner(items);
    
    setTimeout(() => {
        randomBtn.disabled = false;
    }, 3500);
}

function selectFinalWinner(items) {
    const randomIndex = Math.floor(Math.random() * items.length);
    const winnerItem = items[randomIndex];
    const winnerData = currentRestaurants[randomIndex];

    showDrumroll(() => {
        winnerItem.classList.add('selected');
        winnerItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            showWinnerModal(winnerData);
        }, 500);
    });
}

function showWinnerModal(winnerData) {
    const modal = document.getElementById('winner-modal');
    document.getElementById('winner-name').textContent = winnerData.name;
    document.getElementById('winner-address').textContent = winnerData.address;
    document.getElementById('winner-map-btn').href = winnerData.url;
    modal.classList.remove('hidden');
}
