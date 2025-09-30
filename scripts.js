const fileInput = document.getElementById('fileInput')
const loading = document.getElementById('loading')
const statsContent = document.getElementById('statsContent')

let charts = {};

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    loading.style.display = 'block';
    statsContent.style.display = 'none';

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        process(data);
    } catch (err) {
        console.error(err);
    } finally {
        loading.style.display = 'none';
    }
)};

function process(rawData) {
    
    // count adds
    const adsCount = rawData.filter(v =>
       v.details?.some(d => d.name === 'From Google Ads') || !v.subtitles?.[0]?.name
    ).length; 
    
    // format data
    const videos = rawData
        .filter(v =>
            v.title && v.titleUrl &&
            !v.details?.some(d => d.name === 'From Google Ads') && !v.subtitles?.[0]?.name
        )
        .map(v => ({
            t: new Date(v.time),
            c: v.subtitles[0]?.name,
        }));
    
    const stats = calcStats(videos, adsCount);
    // clear from mem 
    rawData = null 
}

function calculateStats(videos, adsCount) {
    const channels = {}
    const monthly = {}
    const weekly = {}
    const hourly = {}

    videos.forEach(v => {
        channels[v.c] = (channelCount[v.c] || 0) + 1

        const monthKey = `${v.t.getFullYear()}-${String(v.t.getMonth() + 1).padStart(2, '0')}`;
        monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;

        const dayOfWeek = v.t.getDay();
        dayOfWeekCount[dayOfWeek]++;
        
        const dayKey = `${v.t.getFullYear()}-${v.t.getMonth()}-${v.t.getDate()}-${dayOfWeek}`;
        uniqueDays.add(dayKey);
        
        hourlyCount[v.t.getHours()]++;
    });

    uniqueDays.ForEach(key => {
        const dayOfWeek = parseInt(key.split('-')[3]);
        dayOfWeekOccurences[dayOfWeek]++;
    });

    const dayOfWeekAverage = dayOfWeekCount.map((count, i) => 
        dayOfWeekOccurrences[i] > 0 ? count / dayOfWeekOccurrences[i] : 0
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
