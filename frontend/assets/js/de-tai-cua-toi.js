// SV-05 Đề tài của tôi: lọc thẻ đề tài theo trạng thái ở thanh tab.
// Chỉ thao tác giao diện, chưa gọi API.
var TAB_BASE = 'status-tab-btn shrink-0 flex items-center gap-2 pt-2 pb-3 px-space-lg rounded-t-lg border-b-2 font-body-md text-body-md font-medium whitespace-nowrap transition-colors';
var TAB_OFF = TAB_BASE + ' text-on-surface-variant border-transparent hover:bg-surface-container-low hover:text-on-surface';
var TAB_ON = TAB_BASE + ' text-primary border-primary bg-primary-fixed/30 font-semibold';
var COUNT_BASE = 'tab-count min-w-[22px] text-center px-1.5 py-0.5 rounded-xl font-label-sm text-label-sm ';

function switchProjectTab(btn, status) {
  document.querySelectorAll('.status-tab-btn').forEach(function (b) {
    var on = b === btn;
    b.className = on ? TAB_ON : TAB_OFF;
    b.setAttribute('aria-selected', String(on));
    var count = b.querySelector('.tab-count');
    if (count) count.className = COUNT_BASE + (on ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-high text-on-surface');
  });

  var shown = 0;
  document.querySelectorAll('.project-item').forEach(function (card) {
    var match = status === 'all' || card.dataset.cardStatus === status;
    card.classList.toggle('hidden', !match);
    if (match) shown++;
  });
  var empty = document.getElementById('empty-state-notice');
  if (empty) empty.classList.toggle('hidden', shown > 0);
}