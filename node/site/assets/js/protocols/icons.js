export function protocolIcon(name) {
    const icons = {
        user: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path><path d="M5 20a7 7 0 0 1 14 0"></path></svg>',
        keyboard: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="6.5" width="17" height="11" rx="2"></rect><path d="M7 10.5h.01"></path><path d="M10 10.5h.01"></path><path d="M13 10.5h.01"></path><path d="M16 10.5h.01"></path><path d="M7 13.5h10"></path></svg>',
        stamp: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 11a4 4 0 1 1 8 0c0 1.5.8 2.9 2 4 .8.7.3 2-.8 2H6.8c-1.1 0-1.6-1.3-.8-2 1.2-1.1 2-2.5 2-4Z"></path><path d="M8 18.5h8"></path><path d="M9.5 21h5"></path></svg>',
        search: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="5.5"></circle><path d="m15 15 4.5 4.5"></path></svg>',
        tag: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 11.5V5.8a1.3 1.3 0 0 1 1.3-1.3h5.7l8 8a2 2 0 0 1 0 2.8l-4.2 4.2a2 2 0 0 1-2.8 0Z"></path><path d="M8.5 8.5h.01"></path></svg>',
        plus: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>',
        send: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m4 20 16-8L4 4l2.2 6.2L14 12l-7.8 1.8L4 20Z"></path></svg>',
        file: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7.5 4.5Z"></path><path d="M14 4.5V9h4"></path></svg>',
        calendar: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5.5" width="16" height="14" rx="2"></rect><path d="M8 3.5v4"></path><path d="M16 3.5v4"></path><path d="M4 9.5h16"></path></svg>',
        money: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="6.5" width="17" height="11" rx="2"></rect><path d="M12 9.5c1.2 0 2 .6 2 1.5s-.8 1.5-2 1.5-2 .6-2 1.5.8 1.5 2 1.5"></path><path d="M12 8v1.5"></path><path d="M12 15.5V17"></path></svg>',
        alert: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4.5 20 18.5H4L12 4.5Z"></path><path d="M12 9v4.5"></path><path d="M12 16.5h.01"></path></svg>',
        archive: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7.5h16"></path><rect x="5" y="7.5" width="14" height="11" rx="2"></rect><path d="M10 11.5h4"></path><path d="M8 7.5V5.5h8v2"></path></svg>',
        restore: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 8H4v-4"></path><path d="M4.5 8.5A8 8 0 1 1 6.8 17"></path></svg>',
        trash: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 7.5h15"></path><path d="M9 7.5v-2h6v2"></path><path d="M8 10.5v6"></path><path d="M12 10.5v6"></path><path d="M16 10.5v6"></path><path d="M6.5 7.5 7.2 19a1.5 1.5 0 0 0 1.5 1.4h6.6a1.5 1.5 0 0 0 1.5-1.4l.7-11.5"></path></svg>',
        map: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 18-5 2V6l5-2 6 2 5-2v14l-5 2-6-2Z"></path><path d="M9 4v14"></path><path d="M15 6v14"></path></svg>',
        note: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v12L14 14.5H7A1.5 1.5 0 0 1 5.5 13V6A1.5 1.5 0 0 1 7 4.5Z"></path></svg>',
        inbox: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 13.5 6.7 6h10.6l2.2 7.5V18a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-4.5Z"></path><path d="M4.8 13.5h4.4a2.8 2.8 0 0 0 5.6 0h4.4"></path></svg>',
        progress: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v7l4 2"></path><path d="M20 12a8 8 0 1 1-2.3-5.7"></path><path d="M20 5.5V10h-4.5"></path></svg>',
        correction: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m4.5 18.5 1-4.2 9.8-9.8a2 2 0 0 1 2.8 2.8l-9.8 9.8-3.8 1.4Z"></path><path d="m13.5 6.3 4.2 4.2"></path><path d="M12 19.5h7.5"></path></svg>',
        done: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 7 10 17l-5-5"></path><path d="M4.5 19.5h15"></path></svg>',
        sync: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 7v5h-5"></path><path d="M4 17v-5h5"></path><path d="M6.1 8.4A7 7 0 0 1 18.8 9"></path><path d="M17.9 15.6A7 7 0 0 1 5.2 15"></path><path d="m9.5 12 1.7 1.7 3.5-3.7"></path></svg>',
        offline: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.2 9.2A9.8 9.8 0 0 1 18.8 9"></path><path d="M8.3 12.3a5.4 5.4 0 0 1 7.4 0"></path><path d="M11 15.5a1.5 1.5 0 0 1 2 0"></path><path d="m4 4 16 16"></path></svg>',
        copy: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M5 15.5V6.5A1.5 1.5 0 0 1 6.5 5h9"></path></svg>',
        print: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.5 8V4.5h9V8"></path><path d="M7.5 17.5h-1A2.5 2.5 0 0 1 4 15v-4.5A2.5 2.5 0 0 1 6.5 8h11A2.5 2.5 0 0 1 20 10.5V15a2.5 2.5 0 0 1-2.5 2.5h-1"></path><path d="M8 14.5h8v5H8z"></path><path d="M17 11.5h.01"></path></svg>',
    };

    return `<span class="protocol-inline-icon protocol-inline-icon-${name}">${icons[name] || icons.file}</span>`;
}
