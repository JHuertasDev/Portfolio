
$(document).ready(function(){

	//

	//------------------------------
	// Btn down
	//------------------------------

	$('.icon_down').click(function(){
		var altura  = $(window).height()-($(".menu_header:visible").length?0:0);
		$('html,body').animate({scrollTop: "+="+$(window).height()});
	});


	//------------------------------
	// BAKCGROUND https://github.com/wagerfield/flat-surface-shader 
	// Mesh Properties
	//------------------------------
	var MESH = {
		width: 1.2,
		height: 1.2,
		depth: 10,
		segments: 16,
		slices: 8,
		xRange: 0.8,
		yRange: 0.1,
		zRange: 1.0,
		ambient: '#555555',
		diffuse: '#FFFFFF',
		speed: 0.002
	};

	//------------------------------
	// Light Properties
	//------------------------------
	var LIGHT = {
		count: 2,
		xyScalar: 1,
		zOffset: 100,
		ambient: '#dedede',
		diffuse: '#191d24',
		speed: 0.001,
		gravity: 1200,
		dampening: 0.95,
		minLimit: 10,
		maxLimit: null,
		minDistance: 20,
		maxDistance: 400,
		autopilot: false,
		draw: true,
		bounds: FSS.Vector3.create(),
		step: FSS.Vector3.create(
			Math.randomInRange(0.2, 1.0),
			Math.randomInRange(0.2, 1.0),
			Math.randomInRange(0.2, 1.0)
		)
	};

	//------------------------------
	//Render Properties
	//------------------------------
	var CANVAS = 'canvas';
	var RENDER = {
		renderer: CANVAS
	};

	//------------------------------
	// UI Properties
	//------------------------------
	var UI = {
		show: true
	};

	//------------------------------
	// Global Properties
	//------------------------------
	var now, start = Date.now();
	var center = FSS.Vector3.create();
	var attractor = FSS.Vector3.create();
	var container = document.getElementById('welcome');
	var ui = document.getElementById('ui');
	var renderer, scene, mesh, geometry, material;
	var webglRenderer, canvasRenderer, svgRenderer;
	var gui, autopilotController;

	//------------------------------
	// Methods
	//------------------------------
	function initialise() {
		createRenderer();
		createScene();
		createMesh();
		createLights();
		addEventListeners();
		resize(container.offsetWidth, container.offsetHeight);
		animate();
	}

	function createRenderer() {
		webglRenderer = new FSS.WebGLRenderer();
		canvasRenderer = new FSS.CanvasRenderer();
		svgRenderer = new FSS.SVGRenderer();
		setRenderer(RENDER.renderer);
	}

	function setRenderer(index) {
		if (renderer) {
			output.removeChild(renderer.element);
		}
		renderer = canvasRenderer;
		
		renderer.setSize($('#welcome .cont_section').width(), $('#welcome .cont_section').height());
		container.appendChild(renderer.element);
	}

	function createScene() {
		scene = new FSS.Scene();
	}

	function createMesh() {
		scene.remove(mesh);
		renderer.clear();
		geometry = new FSS.Plane(MESH.width * renderer.width, MESH.height * renderer.height, MESH.segments, MESH.slices);
		material = new FSS.Material(MESH.ambient, MESH.diffuse);
		mesh = new FSS.Mesh(geometry, material);
		scene.add(mesh);

		// Augment vertices for animation
		var v, vertex;
		for (v = geometry.vertices.length - 1; v >= 0; v--) {
			vertex = geometry.vertices[v];
			vertex.anchor = FSS.Vector3.clone(vertex.position);
			vertex.step = FSS.Vector3.create(
				Math.randomInRange(0.2, 1.0),
				Math.randomInRange(0.2, 1.0),
				Math.randomInRange(0.2, 1.0)
			);
			vertex.time = Math.randomInRange(0, Math.PIM2);
		}
	}

	function createLights() {
		var l, light;
		for (l = scene.lights.length - 1; l >= 0; l--) {
			light = scene.lights[l];
			scene.remove(light);
		}
		renderer.clear();
		for (l = 0; l < LIGHT.count; l++) {
			light = new FSS.Light(LIGHT.ambient, LIGHT.diffuse);
			light.ambientHex = light.ambient.format();
			light.diffuseHex = light.diffuse.format();
			scene.add(light);

			// Augment light for animation
			light.mass = Math.randomInRange(0.5, 1);
			light.velocity = FSS.Vector3.create();
			light.acceleration = FSS.Vector3.create();
			light.force = FSS.Vector3.create();

			// Ring SVG Circle
			light.ring = document.createElementNS(FSS.SVGNS, 'circle');
			light.ring.setAttributeNS(null, 'stroke', light.ambientHex);
			light.ring.setAttributeNS(null, 'stroke-width', '0.5');
			light.ring.setAttributeNS(null, 'fill', 'none');
			light.ring.setAttributeNS(null, 'r', '10');

			// Core SVG Circle
			light.core = document.createElementNS(FSS.SVGNS, 'circle');
			light.core.setAttributeNS(null, 'fill', light.diffuseHex);
			light.core.setAttributeNS(null, 'r', '4');
		}
	}

	function resize(width, height) {
		renderer.setSize(width, height);
		FSS.Vector3.set(center, renderer.halfWidth, renderer.halfHeight);
		createMesh();
	}

	function animate() {
		now = Date.now() - start;
		update();
		render();
		requestAnimationFrame(animate);
	}

	function update() {
		var ox, oy, oz, l, light, v, vertex, offset = MESH.depth/2;

		// Update Bounds
		FSS.Vector3.copy(LIGHT.bounds, center);
		FSS.Vector3.multiplyScalar(LIGHT.bounds, LIGHT.xyScalar);



		// Animate Lights
		for (l = scene.lights.length - 1; l >= 0; l--) {
			light = scene.lights[l];

			// Reset the z position of the light
			FSS.Vector3.setZ(light.position, LIGHT.zOffset);

			// Calculate the force Luke!
			var D = Math.clamp(FSS.Vector3.distanceSquared(light.position, attractor), LIGHT.minDistance, LIGHT.maxDistance);
			var F = LIGHT.gravity * light.mass / D;
			FSS.Vector3.subtractVectors(light.force, attractor, light.position);
			FSS.Vector3.normalise(light.force);
			FSS.Vector3.multiplyScalar(light.force, F);

			// Update the light position
			FSS.Vector3.set(light.acceleration);
			FSS.Vector3.add(light.acceleration, light.force);
			FSS.Vector3.add(light.velocity, light.acceleration);
			FSS.Vector3.multiplyScalar(light.velocity, LIGHT.dampening);
			FSS.Vector3.limit(light.velocity, LIGHT.minLimit, LIGHT.maxLimit);
			FSS.Vector3.add(light.position, light.velocity);
		}

		// Animate Vertices
		for (v = geometry.vertices.length - 1; v >= 0; v--) {
			vertex = geometry.vertices[v];
			ox = Math.sin(vertex.time + vertex.step[0] * now * MESH.speed);
			oy = Math.cos(vertex.time + vertex.step[1] * now * MESH.speed);
			oz = Math.sin(vertex.time + vertex.step[2] * now * MESH.speed);
			FSS.Vector3.set(vertex.position,
				MESH.xRange*geometry.segmentWidth*ox,
				MESH.yRange*geometry.sliceHeight*oy,
				MESH.zRange*offset*oz - offset);
			FSS.Vector3.add(vertex.position, vertex.anchor);
		}

		// Set the Geometry to dirty
		geometry.dirty = true;
	}

	function render() {
		renderer.render(scene);

		// Draw Lights
		if (LIGHT.draw) {
			var l, lx, ly, light;
			for (l = scene.lights.length - 1; l >= 0; l--) {
				light = scene.lights[l];
				lx = light.position[0];
				ly = light.position[1];
				switch(RENDER.renderer) {
					case CANVAS:
						renderer.context.lineWidth = 0.5;
						renderer.context.beginPath();
						renderer.context.arc(lx, ly, 10, 0, Math.PIM2);
						renderer.context.strokeStyle = light.ambientHex;
						renderer.context.stroke();
						renderer.context.beginPath();
						renderer.context.arc(lx, ly, 4, 0, Math.PIM2);
						renderer.context.fillStyle = light.diffuseHex;
						renderer.context.fill();
						break;
					case SVG:
						lx += renderer.halfWidth;
						ly = renderer.halfHeight - ly;
						light.core.setAttributeNS(null, 'fill', light.diffuseHex);
						light.core.setAttributeNS(null, 'cx', lx);
						light.core.setAttributeNS(null, 'cy', ly);
						renderer.element.appendChild(light.core);
						light.ring.setAttributeNS(null, 'stroke', light.ambientHex);
						light.ring.setAttributeNS(null, 'cx', lx);
						light.ring.setAttributeNS(null, 'cy', ly);
						renderer.element.appendChild(light.ring);
						break;
				}
			}
		}
	}

	function addEventListeners() {
		window.addEventListener('resize', onWindowResize);
		container.addEventListener('mousemove', onMouseMove);
	}


	//------------------------------
	// Callbacks
	//------------------------------


	function onMouseMove(event) {
		FSS.Vector3.set(attractor, event.x, renderer.height - event.y);
		FSS.Vector3.subtract(attractor, center);
	}

	function onWindowResize(event) {
		resize(container.offsetWidth, container.offsetHeight);
		render();
	}
	// Let there be light!
	initialise();




	//------------------------------
	// Contacto
	//------------------------------

	//Set functions on click to next and prev button


	// Seteamos el primer tab
	// Current tab is set to be the first tab (0) 
	var currentTab = 0;
	showTab(currentTab); // Display the current tab // Mostramos el primer tab

	function showTab(n) {
		// This function will display the specified tab of the form ...
		// Esta funcion mostrara el tab especificado

		var x = $($(".step")[n]); //Select the specified tab // Seleccionamos el tab especificado
		var y = $(".step"); //Select all the tab //Seleccionamos todos los tabs
		
		x.toggle("slide");
		

		// ... and fix the Previous/Next buttons:
		// ... y acomodo los botones next y prev
		
		var prevBtn = $("#prevBtn");
		var nextBtn = $("#nextBtn");

		if (n == 0) {
			prevBtn.css('display','none');
		} else {
			prevBtn.css('display','inline');
		}
		if (n == (y.length - 1)) {
			document.getElementById("nextBtn").innerHTML = "Enviar";
		} else {
			document.getElementById("nextBtn").innerHTML = "Siguiente";
		}
		// ... and run a function that displays the correct step indicator:
		fixStepIndicator(n);
	}

	function fixStepIndicator(n) {
		// This function removes the "active" class of all circles...
		// Esta acción quita la clase "active" de todos los circulos

		var i, x = document.getElementsByClassName("circle_step");
		for (i = 0; i < x.length; i++) {
			x[i].className = x[i].className.replace(" active", "");
		}
		//... and adds the "active" class to the current step:
		//... Y añade la clase "active" al circle actual
		x[n].className += " active";
	}

	function nextPrev(n) {
		// This function will figure out which tab to display
		// Esta funcion se fijara que tab mostrar

		var x = document.getElementsByClassName("step");

		// Exit the function if any field in the current tab is invalid:
		// Si alguno de los inputs del form actual es incorrecto volvemos

		if (n == 1 && !validateForm()) return false;
		
		// Hide the current tab:
		// Ocultamos el tab actual
		$(x[currentTab]).toggle("slide");

		// Increase or decrease the current tab by 1:
		// Aumentamos o decrecemos el tab actual en 1
		currentTab = currentTab + n;

		// if you have reached the end of the form... :
		// Si alcanzaste el final del form

		if (currentTab >= x.length) {
			//...Send the form with jquery
			//... Envio el form con jquery:
			sendForm();
			
			return false;
		}
		// Otherwise, display the correct tab:
		showTab(currentTab);
	}

	//This function is going to send the form to a php page using aJax
	//Esta pagina va a enviar el formulario usando Ajax
	function sendForm() {
		console.log("Serialize: "+$("#form_contact").serialize());
		$.ajax({
			type: 'post',
			url: 'send-mail.php',
			data: $("#form_contact").serialize(),
			success: function (e) {
				changeFormResponse(e);
		  }
		});
	}
	function changeFormResponse(e){
		$('#form_contact').toggle('slide');
		$('.response .sub_title_form').html(e);
		$('.response').toggle('slide');
	}
	function validateForm() {
		// This function deals with validation of the form fields
		var x, y, i, valid = true;
		x = document.getElementsByClassName("step");
		y = x[currentTab].getElementsByTagName("input");
		console.log(y);
		if(y[0] == null){
			y = x[currentTab].getElementsByTagName("textarea");
		}
		console.log("Current tab: "+currentTab);

		//Verify if is an email
		if(currentTab == 1){
			 var testEmail = /^[A-Z0-9._%+-]+@([A-Z0-9-]+\.)+[A-Z]{2,4}$/i;
			 var value = y[0].value;
			 if(!testEmail.test(value)){
					valid = false;
					y[0].className += " invalid";
			 }
		}else{
			// A loop that checks every input field in the current tab:
			for (i = 0; i < y.length; i++) {
				// If a field is empty...
				if (y[i].value == "") {
					// add an "invalid" class to the field:
					y[i].className += " invalid";
					// and set the current valid status to false:
					valid = false;
				}
			}
		}
		
		// If the valid status is true, mark the step as finished and valid:
		if (valid) {
			y[0].classList.remove("invalid");
			document.getElementsByClassName("step")[currentTab].className += " finish";
		}
		return valid; // return the valid status
	}

	$('#prevBtn').click(function(){
		nextPrev(-1);
	});
	$('#nextBtn').click(function(){
		nextPrev(1);
	});
});
