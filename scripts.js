const fileInput = document.getElementById('fileInput')
const statsContent = document.getElementById('statsContent')
const uploadSection = document.querySelector('.upload-section')

let charts = {};

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('File selected:', file.name, file.size, 'bytes');
    uploadSection.style.display = 'none';
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

function process(rawData) {
    
    // count adds
    const adsCount = rawData.filter(v =>
       v.details?.some(d => d.name === 'From Google Ads') || !v.subtitles?.[0]?.name
    ).length; 
    
    // format data
    const videos = rawData
        .filter(v =>
            v.title && v.titleUrl && v.subtitles?.[0]?.name &&
            !v.details?.some(d => d.name === 'From Google Ads')
        )
        .map(v => ({
            t: new Date(v.time),
            c: v.subtitles[0].name,
        }));
    console.log('Videos after filtering:', videos.length);
    const stats = calculateStats(videos, adsCount);

    displayStats(stats);
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
