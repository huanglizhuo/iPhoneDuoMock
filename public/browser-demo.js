let count=0;
document.getElementById('counter').addEventListener('click',()=>{document.getElementById('counter').textContent=`Clicks: ${++count}`;});
function dimensions(){document.getElementById('viewport').textContent=`Live CSS viewport: ${innerWidth} × ${innerHeight} px`;}
addEventListener('resize',dimensions);dimensions();
