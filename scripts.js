const fileInput = document.getElementById('fileInput')
const statsContent = document.getElementById('statsContent')
const uploadSection = document.querySelector('.upload-section')
const yearDisplay = document.getElementById('yearDisplay');
const faq = document.getElementById('faq')
const filterSection = document.getElementById('filter-section')

let charts = {};
let videos = [];
let adsCount = 0;
let yearSlider = null;

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('File selected:', file.name, file.size, 'bytes');
    uploadSection.style.display = 'none';
    faq.style.display = 'none';
    statsContent.style.display = 'none';

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        console.log('JSON parsed successfully, entries:', data.length);
        process(data);
    } catch (err) {
        console.error(err);
    }
});

function updateStats() {
    if (videos.length === 0) return;

    const [minYear, maxYear] = yearSlider.get().map(v => parseInt(v));
    
    const filteredVideos = videos.filter(v => {
        const year = v.t.getFullYear();
        return year >= minYear && year <= maxYear;
    });

    console.log('Filtered videos:', filteredVideos.length, 'for years', minYear, '-', maxYear);

    const stats = calculateStats(filteredVideos, adsCount);
    console.log('Stats calculated:', stats);
    
    displayStats(stats);
    createCharts(stats);
    
    statsContent.style.display = 'block';
}

function process(rawData) {
    
    // count adds
    adsCount = rawData.filter(v =>
       v.details?.some(d => d.name === 'From Google Ads') || !v.subtitles?.[0]?.name
    ).length; 
    
    // format data
    videos = rawData
        .filter(v =>
            v.title && v.titleUrl && v.subtitles?.[0]?.name &&
            !v.details?.some(d => d.name === 'From Google Ads')
        )
        .map(v => ({
            t: new Date(v.time),
            c: v.subtitles[0].name,
        }));
    console.log('Videos after filtering:', videos.length);
    
    // Get year range from data
    const years = videos.map(v => v.t.getFullYear());
    const minDataYear = Math.min(...years);
    const maxDataYear = Math.max(...years);

    // Initialize noUiSlider
    const slider = document.getElementById('yearSlider');
    yearSlider = noUiSlider.create(slider, {
        start: [minDataYear, maxDataYear],
        connect: true,
        step: 1,
        range: {
            'min': minDataYear,
            'max': maxDataYear
        },
        format: {
            to: value => Math.round(value),
            from: value => Number(value)
        }
    });

    // Update display and stats on slider change
    yearSlider.on('update', (values) => {
        const [minYear, maxYear] = values.map(v => parseInt(v));
        yearDisplay.textContent = `${minYear} - ${maxYear}`;
    });

    yearSlider.on('change', updateStats);

    updateStats()

    filterSection.style.display = 'block';
    // clear from mem 
    rawData = null 
}

function calculateStats(videos, adsCount) {
    const channelCount = {};
    const monthlyCount = {};
    const dayOfWeekCount = Array(7).fill(0);
    const dayOfWeekOccurrences = Array(7).fill(0);
    const hourlyCount = Array(24).fill(0);
    const uniqueDays = new Set();

    videos.forEach(v => {
        channelCount[v.c] = (channelCount[v.c] || 0) + 1;

        const monthKey = `${v.t.getFullYear()}-${String(v.t.getMonth() + 1).padStart(2, '0')}`;
        monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;

        const dayOfWeek = v.t.getDay();
        dayOfWeekCount[dayOfWeek]++;

        const dayKey = `${v.t.getFullYear()}-${v.t.getMonth()}-${v.t.getDate()}-${dayOfWeek}`;
        uniqueDays.add(dayKey);

        hourlyCount[v.t.getHours()]++;
    });

    uniqueDays.forEach(key => {
        const dayOfWeek = parseInt(key.split('-')[3]);
        dayOfWeekOccurrences[dayOfWeek]++;
    });

    const dayOfWeekAverage = dayOfWeekCount.map((count, i) =>
        dayOfWeekOccurrences[i] > 0 ? Math.floor(count / dayOfWeekOccurrences[i]) : 0
    );

    const sortedChannels = Object.entries(channelCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

    const sortedMonths = Object.entries(monthlyCount).sort();

    const dates = videos.map(v => v.t);
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    return {
        total: videos.length,
        ads: adsCount,
        uniqueChannels: Object.keys(channelCount).length,
        minDate,
        maxDate,
        topChannels: sortedChannels,
        monthly: sortedMonths,
        dayOfWeek: dayOfWeekAverage,
        hourly: hourlyCount
    };
}

function displayStats(stats) {
    document.getElementById('totalVideos').textContent = stats.total.toLocaleString();
    document.getElementById('uniqueChannels').textContent = stats.uniqueChannels.toLocaleString();
    document.getElementById('totalAds').textContent = stats.ads.toLocaleString();

    statsContent.style.display = 'block';
}

function createCharts(stats) {
    // Destroy any existing charts
    Object.values(charts).forEach(c => c.destroy());
    charts = {};

    const chartColor = "#EB5E28";
    const gridColor = "#252422";

    Chart.defaults.color = "#888";
    Chart.defaults.borderColor = gridColor;
    
    // Monthly chart 
    charts.monthly = new Chart(document.getElementById('monthlyChart'), {
        type: 'line',
        data: {
            labels: stats.monthly.map(m => m[0]),
            datasets: [{
                label: 'Videos',
                data: stats.monthly.map(m => m[1]),
                borderColor: chartColor,
                backgroundColor: chartColor + '33',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gridColor } },
                y: { grid: { color: gridColor }, beginAtZero: true }
            }
        }
    });

    // Daily chart (day of week averages)
    charts.daily = new Chart(document.getElementById('dailyChart'), {
        type: 'bar',
        data: {
            labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            datasets: [{
                label: 'Avg Videos',
                data: stats.dayOfWeek,
                backgroundColor: chartColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gridColor } },
                y: { 
                    grid: { color: gridColor }, 
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    }
                }
            }
        }
    });

    // Channels chart
    charts.channels = new Chart(document.getElementById('channelsChart'), {
        type: 'bar',
        data: {
            labels: stats.topChannels.map(c => c[0]),
            datasets: [{
                label: 'Videos',
                data: stats.topChannels.map(c => c[1]),
                backgroundColor: chartColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gridColor }, beginAtZero: true },
                y: { grid: { color: gridColor } }
            }
        }
    });

    // Hourly chart
    charts.hourly = new Chart(document.getElementById('hourlyChart'), {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Videos',
                data: stats.hourly,
                backgroundColor: chartColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gridColor } },
                y: { grid: { color: gridColor }, beginAtZero: true }
            }
        }
    });


}
