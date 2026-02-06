/**
 * Bookmarklet — Twitter/X Takipçi Toplama v10.0
 * 
 * Yenilikler:
 * - Profil sayfasından otomatik algılama
 * - Bir taraf bitince diğerine otomatik geçiş
 * - Hatalı sayma düzeltildi (hücre başına tek kullanıcı)
 * - Kendi kullanıcı adını filtreleme
 * - JSON format ile güvenli localStorage
 * 
 * Kullanım:
 * 1. Bir yer imi oluşturun
 * 2. Adres/URL kısmına aşağıdaki minified kodu yapıştırın:
 * 
 * javascript:void((function(){const p=location.pathname.split('/').filter(Boolean);let page=null,user=null;if(p.length>=2){if(p[1]==='followers'){page='followers';user=p[0];}else if(p[1]==='following'){page='following';user=p[0];}}if(!page&&p.length===1&&/^[a-zA-Z0-9_]{1,15}$/.test(p[0])){user=p[0];location.href='/'+user+'/followers';return;}if(!page){alert('Twitter profil/takipçi/takip sayfasına gidin!');return;}const reserved=['home','explore','notifications','messages','i','search','settings','compose','intent','tos','privacy','rules','about','help','verified','premium','login','signup','account','hashtag'];const users=new Set();let last=0,stable=0;const loop=setInterval(()=>{document.querySelectorAll('[data-testid="UserCell"]').forEach(cell=>{const links=cell.querySelectorAll('a[role="link"]');for(const a of links){const h=a.getAttribute('href');if(!h||!h.startsWith('/'))continue;const u=h.slice(1).toLowerCase();if(!u||u.includes('/')||u.length<1||u.length>15)continue;if(!/^[a-z0-9_]+$/.test(u)||reserved.includes(u))continue;if(u===user.toLowerCase())continue;users.add(u);break;}});if(users.size===last){if(++stable>=6){clearInterval(loop);const list=[...users];const key=page==='followers'?'_xf':'_xg';localStorage.setItem(key,JSON.stringify(list));navigator.clipboard.writeText(list.join('\n')).catch(()=>{});const otherKey=page==='followers'?'_xg':'_xf';const otherRaw=localStorage.getItem(otherKey);if(otherRaw){try{const o=JSON.parse(otherRaw);const f=page==='followers'?list:o;const g=page==='following'?list:o;navigator.clipboard.writeText('TAKİPÇİLER:\n'+f.join('\n')+'\n\nTAKİP:\n'+g.join('\n')).catch(()=>{});alert('✅ Tamamlandı!\nTakipçi: '+f.length+'\nTakip: '+g.length);localStorage.removeItem('_xf');localStorage.removeItem('_xg');}catch(e){localStorage.removeItem(otherKey);const n=page==='followers'?'following':'followers';alert('✅ '+list.length+' toplandı!\n➡️ Diğer sayfaya geçiyor...');location.href='/'+user+'/'+n;}}else{const n=page==='followers'?'following':'followers';alert('✅ '+list.length+' toplandı!\n➡️ Diğer sayfaya geçiyor...');location.href='/'+user+'/'+n;}}}else{stable=0;last=users.size;}window.scrollBy(0,3000);},800);})());
 */

// Bookmarklet'in okunabilir versiyonu:
(function () {
    const reserved = ['home', 'explore', 'notifications', 'messages', 'i', 'search',
        'settings', 'compose', 'intent', 'tos', 'privacy', 'rules', 'about',
        'help', 'verified', 'premium', 'login', 'signup', 'account', 'hashtag'];

    // URL'den sayfa tipi ve kullanıcı adı algılama
    const parts = location.pathname.split('/').filter(Boolean);
    let page = null, username = null;

    if (parts.length >= 2) {
        if (parts[1] === 'followers') { page = 'followers'; username = parts[0]; }
        else if (parts[1] === 'following') { page = 'following'; username = parts[0]; }
    }

    // Profil sayfasındaysa otomatik followers'a git
    if (!page && parts.length === 1 && /^[a-zA-Z0-9_]{1,15}$/.test(parts[0])) {
        username = parts[0];
        location.href = '/' + username + '/followers';
        return;
    }

    if (!page) {
        alert('Twitter profil, takipçi veya takip sayfasına gidin!');
        return;
    }

    const type = page === 'followers' ? 'TAKİPÇİ' : 'TAKİP';
    console.log('🔄 @' + username + ' ' + type + ' toplanıyor...');

    const users = new Set();
    let lastCount = 0;
    let stableCount = 0;

    const scroll = setInterval(() => {
        // Her hücreden sadece bir kullanıcı adı al
        document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
            const links = cell.querySelectorAll('a[role="link"]');
            for (const a of links) {
                const href = a.getAttribute('href');
                if (!href || !href.startsWith('/')) continue;
                const u = href.slice(1).toLowerCase();
                if (!u || u.includes('/')) continue;
                if (u.length < 1 || u.length > 15) continue;
                if (!/^[a-z0-9_]+$/.test(u)) continue;
                if (reserved.includes(u)) continue;
                if (u === username.toLowerCase()) continue;
                users.add(u);
                break; // Bu hücreden bir kullanıcı aldık
            }
        });

        if (users.size === lastCount) {
            stableCount++;
            if (stableCount >= 6) {
                clearInterval(scroll);

                const list = [...users];
                const key = page === 'followers' ? '_xf' : '_xg';
                localStorage.setItem(key, JSON.stringify(list));

                navigator.clipboard.writeText(list.join('\n')).catch(() => { });

                console.log('✅ ' + type + ': ' + list.length + ' kişi');

                // Diğer taraf toplandı mı kontrol et
                const otherKey = page === 'followers' ? '_xg' : '_xf';
                const otherRaw = localStorage.getItem(otherKey);

                if (otherRaw) {
                    try {
                        const otherList = JSON.parse(otherRaw);
                        const f = page === 'followers' ? list : otherList;
                        const g = page === 'following' ? list : otherList;

                        const allText = 'TAKİPÇİLER:\n' + f.join('\n') + '\n\nTAKİP EDİLENLER:\n' + g.join('\n');
                        navigator.clipboard.writeText(allText).catch(() => { });

                        alert('✅ Tamamlandı!\n\nTakipçi: ' + f.length + '\nTakip: ' + g.length +
                            '\n\nSiteye yapıştırabilirsiniz.');
                        localStorage.removeItem('_xf');
                        localStorage.removeItem('_xg');
                    } catch (e) {
                        localStorage.removeItem(otherKey);
                        goToOther();
                    }
                } else {
                    goToOther();
                }
            }
        } else {
            stableCount = 0;
            lastCount = users.size;
        }

        window.scrollBy(0, 3000);
    }, 800);

    function goToOther() {
        const next = page === 'followers' ? 'following' : 'followers';
        const nextType = next === 'followers' ? 'TAKİPÇİ' : 'TAKİP';
        alert('✅ ' + type + ': ' + users.size + ' kişi toplandı!\n\n➡️ ' + nextType +
            ' sayfasına geçiyor...\nSayfa yüklenince bookmarklet\'i tekrar tıklayın.');
        location.href = '/' + username + '/' + next;
    }
})();
