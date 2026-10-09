(() => {
    const input = document.getElementById('chkTaskDeadline');
    if (!input || !window.flatpickr) return;
    flatpickr(input, {
        locale: 'id',
        dateFormat: 'Y-m-d',
        disableMobile: true,
        static: true,
        animate: false,
        monthSelectorType: 'static',
        onOpen: (_, __, picker) => picker.setDate(input.value, false),
        onReady: (_, __, picker) => {
            input.placeholder = 'Pilih tanggal deadline';
            input.setAttribute('aria-haspopup', 'dialog');
            picker.calendarContainer.setAttribute('role', 'dialog');
            picker.calendarContainer.setAttribute('aria-label', 'Pilih deadline tugas');
            picker.calendarContainer.querySelector('.flatpickr-prev-month').setAttribute('aria-label', 'Bulan sebelumnya');
            picker.calendarContainer.querySelector('.flatpickr-next-month').setAttribute('aria-label', 'Bulan berikutnya');
        }
    });
})();
