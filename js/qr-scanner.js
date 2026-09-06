const qrActions = [
    { match: ['keymorgan', 'delo'], action: 'tab', target: '#check_versions' },
    { match: ['telephone5', 'telephone'], action: 'tab', target: '#phone' },
    { match: ['startaudio5', 'start'], action: 'audio', id: 'audio-start' },
    { match: ['grimm', 'grim'], action: 'audio', id: 'audio-grim' },
    { match: ['klaus', 'casper', 'casper_klaus'], action: 'audio', id: 'audio-casper-klaus' },
    { match: ['morse', 'morgan', 'morgan-morze'], action: 'audio', id: 'audio-morgan-morze' },
    { match: ['tompson'], action: 'audio', id: 'audio-tompson' },
    { match: ['frost'], action: 'audio', id: 'audio-frost' },
    { match: ['vv', 'valdemar'], action: 'audio', id: 'audio-valdemar' },
    { match: ['finalaudio5', 'final'], action: 'audio', id: 'audio-final' },
];

let html5QrCode = null;

$(document).ready(function () {
    $('#qr-trigger').on('click', function () {
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
            console.error("Camera access failed", err);
            stopQrScanner();
            switchToOpisTab();
        });
}

function stopQrScanner() {
    $('#qr-scanner-overlay').hide();
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => {
            console.error("Failed to stop scanner", err);
        });
    }
}

function onScanSuccess(decodedText, decodedResult) {
    let matchedAction = null;
    let text = decodedText.toLowerCase();
    
    for (let item of qrActions) {
        if (item.match.some(m => text.includes(m.toLowerCase()))) {
            matchedAction = item;
            break;
        }
    }

    if (matchedAction) {
        stopQrScanner();
        
        if (matchedAction.action === 'tab') {
            switchToTab(matchedAction.target);
        } else if (matchedAction.action === 'audio') {
            switchToOpisTab();
            stopAllAudio();
            const audioElem = document.getElementById(matchedAction.id);
            if (audioElem) {
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
    // ignore
}

function switchToTab(targetSelector) {
    $(`.nav-link[data-bs-target="${targetSelector}"]`).trigger('click');
}

function switchToOpisTab() {
    switchToTab('#opis');
}
