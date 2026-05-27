// EcoTrack - Modern Waste Monitoring Dashboard

document.addEventListener("DOMContentLoaded", () => {
    // Connect to backend Socket.IO
    const socket = io("http://localhost:3000");

    // Initialize Leaflet map with modern style
    const map = L.map("map").setView([22.261404, 88.197992], 12);

    // Use a more modern map tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Application State
    const appState = {
        binsMarkers: {},
        binsData: {},
        stats: {
            totalBins: 0,
            onlineBins: 0,
            warningBins: 0,
            criticalBins: 0
        }
    };

    // DOM Elements
    const elements = {
        tableBody: document.getElementById("binsTable"),
        statusFilter: document.getElementById("statusFilter"),
        totalBins: document.getElementById("totalBins"),
        onlineBins: document.getElementById("onlineBins"),
        warningBins: document.getElementById("warningBins"),
        criticalBins: document.getElementById("criticalBins"),
        notificationContainer: document.getElementById("notificationContainer"),
        currentTime: document.getElementById("currentTime"),
        connectionStatus: document.getElementById("connectionStatus")
    };

    // Update current time
    function updateCurrentTime() {
        const now = new Date();
        elements.currentTime.textContent = now.toLocaleTimeString();
    }
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();

    // Utility Functions
    const utils = {
        getBinStatus: (bin) => {
            const { capacity } = bin;
            const dry = capacity.dry || capacity.dryWaste || 0;
            const wet = capacity.wet || capacity.wetWaste || 0;
            
            const maxCapacity = Math.max(dry, wet);
            
            if (maxCapacity >= 90) return "critical";
            if (maxCapacity >= 75) return "warning";
            return "online";
        },

        getCapacityClass: (capacity) => {
            if (capacity >= 90) return "capacity-high";
            if (capacity >= 75) return "capacity-medium";
            return "capacity-low";
        },

        createBinIcon: (status) => {
            const colors = {
                online: '#10b981',
                warning: '#f59e0b',
                critical: '#ef4444'
            };

            // Modern SVG icon with shadow
            return L.divIcon({
                html: `
                    <div class="relative bin-marker">
                        <div class="absolute inset-0 bg-black opacity-20 blur-sm rounded-full transform scale-110"></div>
                        <div class="relative w-6 h-6 rounded-full border-2 border-white shadow-lg" style="background-color: ${colors[status]}">
                            <div class="absolute inset-0 rounded-full border-2 border-white/30"></div>
                        </div>
                    </div>
                `,
                className: `modern-bin-marker bin-${status}`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
        },

        createCapacityBar: (value, type) => {
            const typeLabels = {
                dry: "Dry Waste",
                wet: "Wet Waste"
            };
            
            const typeColors = {
                dry: "#10b981",
                wet: "#3b82f6"
            };

            const barWidth = Math.min(Math.max(value, 0), 100);

            return `
                <div class="capacity-section">
                    <div class="capacity-header">
                        <span class="capacity-label">${typeLabels[type]}</span>
                        <span class="capacity-value">${value}%</span>
                    </div>
                    <div class="capacity-bar-container">
                        <div class="capacity-bar" style="width: ${barWidth}%; background-color: ${typeColors[type]}">
                            <span class="capacity-bar-text">${value}%</span>
                        </div>
                    </div>
                </div>
            `;
        },

        createPopupContent: (bin) => {
            const { deviceId, name, capacity, lastUpdated } = bin;
            const status = utils.getBinStatus(bin);
            
            const dry = capacity.dry || capacity.dryWaste || 0;
            const wet = capacity.wet || capacity.wetWaste || 0;
            
            const capacityBars = `
                ${utils.createCapacityBar(dry, 'dry')}
                ${utils.createCapacityBar(wet, 'wet')}
            `;

            const statusIcons = {
                online: 'fa-check-circle',
                warning: 'fa-exclamation-triangle',
                critical: 'fa-times-circle'
            };

            return `
                <div class="popup-content">
                    <div class="bin-name">${name || "Unnamed Bin"}</div>
                    <div class="bin-id">ID: ${deviceId}</div>
                    <div class="status-badge ${status}">
                        <i class="fas ${statusIcons[status]} mr-2"></i>
                        ${status.toUpperCase()}
                    </div>
                    ${capacityBars}
                    <div class="last-updated">
                        <i class="fas fa-clock mr-1"></i>
                        Updated: ${new Date(lastUpdated).toLocaleString()}
                    </div>
                </div>
            `;
        },

        normalizeBinData: (binData) => {
            const dry = parseInt(binData.capacity?.dry || binData.capacity?.dryWaste || binData.dryWaste || 0);
            const wet = parseInt(binData.capacity?.wet || binData.capacity?.wetWaste || binData.wetWaste || 0);

            return {
                deviceId: binData.deviceId || binData.id || binData._id || `BIN-${Math.random().toString(36).substr(2, 5)}`,
                name: binData.name || binData.binName || `Bin ${binData.deviceId || binData.id}`,
                location: binData.location || { 
                    coordinates: binData.coordinates || [77.5946 + (Math.random() - 0.5) * 0.1, 12.9716 + (Math.random() - 0.5) * 0.1] 
                },
                capacity: {
                    dry: dry,
                    wet: wet
                },
                lastUpdated: binData.lastUpdated || binData.updatedAt || binData.timestamp || new Date()
            };
        }
    };

    // Modern Notification System
    const notification = {
        show: (message, type = "info", duration = 5000) => {
            const notificationEl = document.createElement("div");
            notificationEl.className = `notification ${type}`;
            
            const icons = {
                success: 'fa-check-circle',
                info: 'fa-info-circle',
                warning: 'fa-exclamation-triangle',
                error: 'fa-times-circle'
            };
            
            notificationEl.innerHTML = `
                <div class="flex items-center space-x-3">
                    <i class="fas ${icons[type]} text-lg"></i>
                    <span>${message}</span>
                </div>
            `;
            
            elements.notificationContainer.appendChild(notificationEl);
            
            setTimeout(() => {
                notificationEl.classList.add("show");
            }, 100);
            
            setTimeout(() => {
                notificationEl.classList.remove("show");
                setTimeout(() => {
                    notificationEl.remove();
                }, 500);
            }, duration);
        }
    };

    // Stats Management with animations
    const statsManager = {
        update: () => {
            // Add animation to stats updates
            [elements.totalBins, elements.onlineBins, elements.warningBins, elements.criticalBins].forEach(el => {
                el.classList.add('data-update');
                setTimeout(() => el.classList.remove('data-update'), 600);
            });

            elements.totalBins.textContent = appState.stats.totalBins;
            elements.onlineBins.textContent = appState.stats.onlineBins;
            elements.warningBins.textContent = appState.stats.warningBins;
            elements.criticalBins.textContent = appState.stats.criticalBins;
        },

        recalculate: () => {
            const bins = Object.values(appState.binsData);
            appState.stats.totalBins = bins.length;
            appState.stats.onlineBins = bins.filter(bin => utils.getBinStatus(bin) === 'online').length;
            appState.stats.warningBins = bins.filter(bin => utils.getBinStatus(bin) === 'warning').length;
            appState.stats.criticalBins = bins.filter(bin => utils.getBinStatus(bin) === 'critical').length;
            statsManager.update();
        }
    };

    // Map Management with enhanced animations
    const mapManager = {
        updateMarker: (bin) => {
            const { deviceId, location } = bin;
            if (!location?.coordinates) return;

            let lat, lng;
            if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
                [lng, lat] = location.coordinates;
                if (Math.abs(lng) > 90) {
                    [lat, lng] = location.coordinates;
                }
            } else {
                return;
            }

            const status = utils.getBinStatus(bin);
            const newIcon = utils.createBinIcon(status);
            const wasPopupOpen = appState.binsMarkers[deviceId]?.isPopupOpen();
            const oldStatus = appState.binsData[deviceId] ? utils.getBinStatus(appState.binsData[deviceId]) : null;

            if (appState.binsMarkers[deviceId]) {
                // Store current position for animation
                const oldLatLng = appState.binsMarkers[deviceId].getLatLng();
                const newLatLng = [lat, lng];
                
                // Update marker with new icon and position
                appState.binsMarkers[deviceId]
                    .setLatLng(newLatLng)
                    .setIcon(newIcon)
                    .setPopupContent(utils.createPopupContent(bin));

                // Animate if status changed or position changed significantly
                if (oldStatus !== status) {
                    mapManager.animateStatusChange(appState.binsMarkers[deviceId], status);
                }
                
                // Animate position change if moved significantly
                if (oldLatLng.distanceTo(newLatLng) > 10) {
                    mapManager.animatePositionChange(appState.binsMarkers[deviceId], oldLatLng, newLatLng);
                }
            } else {
                // Create new marker with entrance animation
                appState.binsMarkers[deviceId] = L.marker([lat, lng], { 
                    icon: newIcon 
                })
                    .addTo(map)
                    .bindPopup(utils.createPopupContent(bin));
                
                // Add entrance animation
                mapManager.animateMarkerEntrance(appState.binsMarkers[deviceId]);
                
                appState.binsMarkers[deviceId].on('click', function() {
                    this.openPopup();
                });
            }

            // Restore popup state if it was open
            if (wasPopupOpen) {
                setTimeout(() => {
                    appState.binsMarkers[deviceId].openPopup();
                }, 300);
            }
        },

        // Animation for status changes
        animateStatusChange: (marker, newStatus) => {
            const element = marker.getElement();
            if (!element) return;

            element.classList.add('status-changing', `changing-to-${newStatus}`);
            
            // Create ripple effect
            const ripple = document.createElement('div');
            ripple.className = 'status-ripple';
            element.appendChild(ripple);
            
            setTimeout(() => {
                element.classList.remove('status-changing', `changing-to-${newStatus}`);
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 1000);
        },

        // Animation for position changes
        animatePositionChange: (marker, fromLatLng, toLatLng) => {
            const element = marker.getElement();
            if (!element) return;

            element.classList.add('position-moving');
            setTimeout(() => {
                element.classList.remove('position-moving');
            }, 1000);
        },

        // Animation for new marker entrance
        animateMarkerEntrance: (marker) => {
            const element = marker.getElement();
            if (!element) return;

            element.classList.add('marker-entrance');
            setTimeout(() => {
                element.classList.remove('marker-entrance');
            }, 1500);
        },

        // Remove marker with animation
        removeMarker: (deviceId) => {
            if (appState.binsMarkers[deviceId]) {
                const marker = appState.binsMarkers[deviceId];
                const element = marker.getElement();
                
                if (element) {
                    element.classList.add('marker-removal');
                    setTimeout(() => {
                        map.removeLayer(marker);
                        delete appState.binsMarkers[deviceId];
                    }, 500);
                } else {
                    map.removeLayer(marker);
                    delete appState.binsMarkers[deviceId];
                }
            }
        }
    };

    // Table Management
    const tableManager = {
        updateRow: (bin) => {
            const { deviceId, name, capacity, lastUpdated } = bin;
            const status = utils.getBinStatus(bin);

            const dry = parseInt(capacity.dry || capacity.dryWaste || 0);
            const wet = parseInt(capacity.wet || capacity.wetWaste || 0);

            let row = document.getElementById(`row-${deviceId}`);
            const isNew = !row;
            const oldStatus = row ? row.className.match(/bin-(online|warning|critical)/)?.[0]?.replace('bin-', '') : null;
            
            if (!row) {
                row = document.createElement("tr");
                row.id = `row-${deviceId}`;
                row.className = `bin-row bin-${status} data-update row-entrance`;
                elements.tableBody.appendChild(row);
            } else {
                const statusChanged = oldStatus !== status;
                row.className = `bin-row bin-${status} data-update ${statusChanged ? 'status-update' : ''}`;
            }

            const statusIcons = {
                online: 'fa-check-circle',
                warning: 'fa-exclamation-triangle', 
                critical: 'fa-times-circle'
            };

            row.innerHTML = `
                <td class="py-4 px-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <span class="status-indicator status-${status}">
                            <i class="fas ${statusIcons[status]}"></i>
                        </span>
                        <span class="capitalize text-sm font-medium">${status}</span>
                    </div>
                </td>
                <td class="py-4 px-4 whitespace-nowrap text-sm font-semibold text-gray-900">${deviceId}</td>
                <td class="py-4 px-4 whitespace-nowrap text-sm text-gray-700">${name || "N/A"}</td>
                <td class="py-4 px-4 whitespace-nowrap">
                    <div class="flex flex-col items-center">
                        <span class="text-sm font-semibold mb-1 ${dry >= 75 ? 'text-red-600' : dry >= 50 ? 'text-yellow-600' : 'text-green-600'}">${dry}%</span>
                        <div class="capacity-indicator ${utils.getCapacityClass(dry)} w-16"></div>
                    </div>
                </td>
                <td class="py-4 px-4 whitespace-nowrap">
                    <div class="flex flex-col items-center">
                        <span class="text-sm font-semibold mb-1 ${wet >= 75 ? 'text-red-600' : wet >= 50 ? 'text-yellow-600' : 'text-green-600'}">${wet}%</span>
                        <div class="capacity-indicator ${utils.getCapacityClass(wet)} w-16"></div>
                    </div>
                </td>
                <td class="py-4 px-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="font-medium">${new Date(lastUpdated).toLocaleTimeString()}</div>
                    <div class="text-xs text-gray-400">${new Date(lastUpdated).toLocaleDateString()}</div>
                </td>
            `;

            // Remove animation classes after animation completes
            setTimeout(() => {
                row.classList.remove('data-update', 'status-update', 'row-entrance');
            }, 600);
        },

        applyFilter: () => {
            const filterValue = elements.statusFilter.value;
            const rows = document.querySelectorAll('.bin-row');
            
            rows.forEach(row => {
                if (filterValue === 'all' || row.classList.contains(`bin-${filterValue}`)) {
                    row.style.display = '';
                    row.classList.add('row-show');
                    setTimeout(() => row.classList.remove('row-show'), 300);
                } else {
                    row.classList.add('row-hide');
                    setTimeout(() => {
                        row.style.display = 'none';
                        row.classList.remove('row-hide');
                    }, 300);
                }
            });
        }
    };

    // Main Bin Update Function
    function updateBin(binData) {
        try {
            const bin = utils.normalizeBinData(binData);
            const { deviceId } = bin;
            const oldBin = appState.binsData[deviceId];
            
            appState.binsData[deviceId] = bin;
            
            mapManager.updateMarker(bin);
            tableManager.updateRow(bin);
            
            statsManager.recalculate();
        } catch (error) {
            console.error('Error updating bin:', error);
        }
    }

    // Event Listeners
    elements.statusFilter.addEventListener('change', tableManager.applyFilter);

    // Socket.IO Event Handlers
    socket.on("bin:update", (bin) => {
        updateBin(bin);
        const status = utils.getBinStatus(bin);
        notification.show(`Bin ${bin.name || bin.deviceId} updated - ${status.toUpperCase()}`, status);
    });
    
    socket.on("bin:new", (bin) => {
        updateBin(bin);
        notification.show(`New bin added: ${bin.name || bin.deviceId}`, "success");
    });

    socket.on("bin:remove", (binData) => {
        const deviceId = binData.deviceId || binData.id;
        if (deviceId) {
            mapManager.removeMarker(deviceId);
            delete appState.binsData[deviceId];
            
            const row = document.getElementById(`row-${deviceId}`);
            if (row) {
                row.classList.add('row-removal');
                setTimeout(() => row.remove(), 500);
            }
            
            statsManager.recalculate();
            notification.show(`Bin ${binData.name || deviceId} removed`, "info");
        }
    });

    socket.on("connect", () => {
        console.log('✅ Connected to backend server');
        elements.connectionStatus.innerHTML = '<i class="fas fa-circle text-green-500 text-xs"></i><span>Connected</span>';
        elements.connectionStatus.className = 'flex items-center space-x-1 text-green-600';
        notification.show("Connected to monitoring system", "success", 3000);
    });

    socket.on("disconnect", () => {
        console.log('❌ Disconnected from backend server');
        elements.connectionStatus.innerHTML = '<i class="fas fa-circle text-red-500 text-xs"></i><span>Disconnected</span>';
        elements.connectionStatus.className = 'flex items-center space-x-1 text-red-600';
        notification.show("Connection lost - attempting to reconnect", "error");
    });

    socket.on("reconnect", () => {
        console.log('🔄 Reconnected to backend server');
        elements.connectionStatus.innerHTML = '<i class="fas fa-circle text-green-500 text-xs"></i><span>Connected</span>';
        elements.connectionStatus.className = 'flex items-center space-x-1 text-green-600';
        notification.show("Reconnected to monitoring system", "success", 2000);
    });

    // Load initial bins
    function loadInitialBins() {
        console.log('🔄 Fetching initial bins from backend API...');
        
        fetch("http://localhost:3000/api/bins")
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                let bins = [];
                if (Array.isArray(data)) {
                    bins = data;
                } else if (data.bins && Array.isArray(data.bins)) {
                    bins = data.bins;
                } else if (data.data && Array.isArray(data.data)) {
                    bins = data.data;
                } else {
                    throw new Error("Invalid data format");
                }
                
                if (bins.length === 0) {
                    notification.show("No bins found in system", "warning");
                    return;
                }
                
                // Stagger the initial bin loading for better visual effect
                bins.forEach((bin, index) => {
                    setTimeout(() => {
                        updateBin(bin);
                    }, index * 100);
                });
                
                notification.show(`System ready - monitoring ${bins.length} bins`, "success", 4000);
            })
            .catch(err => {
                console.error("Failed to fetch initial bins:", err);
                notification.show("Unable to connect to backend system", "error");
            });
    }

    // Initialize application
    loadInitialBins();
});