const div = document.createElement('div');
div.id = 'ducatusLoader';
div.innerHTML = `<img style="display:block;margin-left:auto;margin-right:auto;margin-top:80px;width:250px;" src="assets/img/app/logo-negative2.png" alt="Ducatus">`;
document.body.appendChild(div);

window.onload = function() {
  const script = document.createElement('script');
 
  script.src = 'build/main.js';
  document.head.append(script);
};
