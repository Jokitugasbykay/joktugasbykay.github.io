(() => {
    const input = document.getElementById('chkTaskDeadline');
    if (!input || !window.flatpickr) return;
    flatpickr(input, {
        locale: 'id',
        dateFormat: 'Y-m-d',
        disableMobile: true,
        monthSelectorType: 'static',
        onOpen: (_, __, picker) => picker.setDate(input.value, false),
        onReady: (_, __, picker) => {
            picker.calendarContainer.setAttribute('aria-label', 'Pilih deadline tugas');
        }
    });
})();
