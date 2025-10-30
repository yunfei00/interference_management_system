(function(){
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const checkAll = $("#check-all");
  if (checkAll) {
    checkAll.addEventListener("change", () => {
      $$(".row-check").forEach(x => x.checked = checkAll.checked);
    });
  }

  function getSelectedHostIds(){
    return $$(".row-check:checked").map(x => x.value);
  }

  function submitBatch(command, serviceName){
    const form = $("#batch-form");
    if (!form) return;
    $("#batch-command").value = command;
    $("#batch-service-name").value = serviceName || "";
    // 清理旧的 host_ids[]
    form.querySelectorAll("input[name='host_ids[]']").forEach(e => e.remove());
    getSelectedHostIds().forEach(id => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "host_ids[]";
      input.value = id;
      form.appendChild(input);
    });
    form.submit();
  }

  function confirmAndRun(command){
    const ids = getSelectedHostIds();
    if (ids.length === 0) { alert("请先勾选主机"); return; }
    if (command === "shutdown" || command === "reboot"){
      if (!confirm("确定要对选中主机执行 " + command + " 吗？")) return;
      submitBatch(command, "");
      return;
    }
    const modalEl = new bootstrap.Modal(document.getElementById('serviceModal'));
    modalEl.show();
    $("#btn-service-confirm").onclick = () => {
      const name = $("#inputServiceName").value.trim();
      if (!name) { alert("请输入服务名"); return; }
      modalEl.hide();
      submitBatch(command, name);
    };
  }

  const bindBtn = (id, cmd) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", () => confirmAndRun(cmd));
  };
  bindBtn("btn-shutdown", "shutdown");
  bindBtn("btn-reboot", "reboot");
  bindBtn("btn-service-start", "service_start");
  bindBtn("btn-service-restart", "service_restart");
  bindBtn("btn-service-stop", "service_stop");
})();
