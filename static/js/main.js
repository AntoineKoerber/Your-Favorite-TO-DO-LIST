$(function() {
  var $innerDiv = $('div > div');
  var height = $('div').height() - $innerDiv.height();
  var speed = 2000; // milliseconds per cycle
  var delay = 1000; // delay before starting animation

  function animateDiv() {
    $innerDiv.animate({ top: height }, speed, function() {
      $innerDiv.animate({ top: 0 }, speed, animateDiv);
    });
  }

  setTimeout(animateDiv, delay);
});
