const qrActions = {
    'http://crimegames.ru/keymorgan': { action: 'tab', target: '#check_versions' },
    'http://crimegames.ru/telephone5': { action: 'tab', target: '#phone' },
    'http://crimegames.ru/startaudio5': { action: 'audio', id: 'audio-start' },
    'http://crimegames.ru/grimm': { action: 'audio', id: 'audio-grim' },
    'http://crimegames.ru/klaus': { action: 'audio', id: 'audio-casper-klaus' },
    'http://crimegames.ru/morse': { action: 'audio', id: 'audio-morgan-morze' },
    'http://crimegames.ru/tompson': { action: 'audio', id: 'audio-tompson' },
    'http://crimegames.ru/frost': { action: 'audio', id: 'audio-frost' },
    'http://crimegames.ru/vv': { action: 'audio', id: 'audio-valdemar' },
    'http://crimegames.ru/finalaudio5': { action: 'audio', id: 'audio-final' },
};

let html5QrCode = null;

$(document).ready(function () {
    $('#qr-trigger').on('click', function () {
        // Try to start scanner
        startQrScanner();
    });

    $('#close-qr-scanner').on('click', function () {
        stopQrScanner();
    });
});

function stopAllAudio() {
    $('audio').each(function () {
        this.pause();
        this.currentTime = 0;
    });
}

function startQrScanner() {
    $('#qr-scanner-overlay').css('display', 'flex');

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
    }

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
        .catch(err => {
            // Camera failed or permission denied, fallback to "Опись"
            console.error("Camera access failed", err);
            stopQrScanner();
            switchToOpisTab();
        });
}

function stopQrScanner() {
    $('#qr-scanner-overlay').hide();
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(ignore => {
            // QR Code scanning is stopped.
        }).catch(err => {
            console.error("Failed to stop scanner", err);
        });
    }
}

function onScanSuccess(decodedText, decodedResult) {
    if (qrActions[decodedText]) {
        // Match found!
        stopQrScanner();
        
        const act = qrActions[decodedText];
        if (act.action === 'tab') {
            switchToTab(act.target);
        } else if (act.action === 'audio') {
            switchToOpisTab();
            stopAllAudio();
            const audioElem = document.getElementById(act.id);
            if (audioElem) {
                // Find the parent hint-group and scroll to it
                const group = $(audioElem).closest('.hint-group');
                if (group.length) {
                    $('html, body').animate({
                        scrollTop: group.offset().top - 100
                    }, 500);
                }
                audioElem.play();
            }
        }
    }
}

function onScanFailure(error) {
    // handle scan failure, usually better to ignore and keep scanning
}

function switchToTab(targetSelector) {
    const triggerEl = document.querySelector(`[data-bs-target="${targetSelector}"]`);
    if (triggerEl) {
        const tab = new bootstrap.Tab(triggerEl);
        tab.show();
    }
}

function switchToOpisTab() {
    switchToTab('#opis');
}
