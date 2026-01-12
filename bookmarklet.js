/**
 * Bookmarklet - Twitter/X Takipçi Toplama
 * Bu kodu bir yer imine ekleyerek Twitter takipçi/takip sayfasında kullanabilirsiniz.
 * 
 * Kullanım:
 * 1. Bir yer imi oluşturun
 * 2. Adres/URL kısmına aşağıdaki kodu yapıştırın:
 * 
 * javascript:(function(){const type=window.location.href.includes('/followers')?'followers':window.location.href.includes('/following')?'following':null;if(!type){alert('Lütfen Twitter takipçi veya takip sayfasında bu bookmarklet\'i kullanın.');return;}alert('Veriler toplanıyor... Sayfa otomatik scroll yapacak. Lütfen bekleyin.');const users=new Set();let lastCount=0;let stableCount=0;const scroll=setInterval(()=>{document.querySelectorAll('[data-testid="UserCell"]').forEach(cell=>{const link=cell.querySelector('a[href^="/"]');if(link){const username=link.getAttribute('href').replace('/','');if(username&&!username.includes('/')){users.add(username);}}});if(users.size===lastCount){stableCount++;if(stableCount>=3){clearInterval(scroll);const data={type,users:Array.from(users),date:new Date().toISOString()};localStorage.setItem('xAnalyzerData_'+type,JSON.stringify(data));alert('✅ '+users.size+' '+(type==='followers'?'takipçi':'takip')+' toplandı! Ana sayfaya dönün ve sayfayı yenileyin.');}}else{stableCount=0;lastCount=users.size;}window.scrollBy(0,1000);},500);})();
 */

// Bookmarklet'in okunabilir versiyonu:
(function () {
    // Sayfanın takipçi mi takip mi olduğunu belirle
    const type = window.location.href.includes('/followers') ? 'followers' :
        window.location.href.includes('/following') ? 'following' : null;

    if (!type) {
        alert('Lütfen Twitter takipçi veya takip sayfasında bu bookmarklet\'i kullanın.');
        return;
    }

    alert('Veriler toplanıyor... Sayfa otomatik scroll yapacak. Lütfen bekleyin.');

    const users = new Set();
    let lastCount = 0;
    let stableCount = 0;

    const scroll = setInterval(() => {
        // Sayfadaki tüm kullanıcı hücrelerini bul
        document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
            const link = cell.querySelector('a[href^="/"]');
            if (link) {
                const username = link.getAttribute('href').replace('/', '');
                if (username && !username.includes('/')) {
                    users.add(username);
                }
            }
        });

        // Yeni kullanıcı bulunamadıysa sayacı artır
        if (users.size === lastCount) {
            stableCount++;
            // 3 kere üst üste aynı sayıda kaldıysa bitir
            if (stableCount >= 3) {
                clearInterval(scroll);

                // Verileri localStorage'a kaydet
                const data = {
                    type,
                    users: Array.from(users),
                    date: new Date().toISOString()
                };
                localStorage.setItem('xAnalyzerData_' + type, JSON.stringify(data));

                alert('✅ ' + users.size + ' ' + (type === 'followers' ? 'takipçi' : 'takip') +
                    ' toplandı! Ana sayfaya dönün ve sayfayı yenileyin.');
            }
        } else {
            stableCount = 0;
            lastCount = users.size;
        }

        // Sayfayı aşağı kaydır
        window.scrollBy(0, 1000);
    }, 500);
})();
