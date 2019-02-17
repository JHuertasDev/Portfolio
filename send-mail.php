<?php 
	
	//Filter inputs
	$name = $_POST['name'];
	$mail = $_POST['mail'];
	$msg = $_POST['message'];

	$errors = false;
	if (filter_var($mail, FILTER_VALIDATE_EMAIL) == false) {
		$errors = true;
	}
	if(!preg_match("/^[a-zA-Z'-]+$/", $name)){
		$errors = true;
	}
	if(!preg_match("/^[A-Za-z0-9.,+]/", $msg)){
		$errors = true;
	}
	if($errors){
		echo "Ocurrio un error. Intentelo nuevamente mas tarde";
		die();
	}

	//Store the mail in DB

	//Connect to DB
	$servername = "localhost";
	$username = "Adm";
	$password = "arbolrojo12";
	$dbname = "Portfolio";
	// Create connection
	$conn = new mysqli($servername, $username, $password, $dbname);

	if ($conn->connect_error) {
		echo "Ocurrio un error. Intentelo nuevamente mas tarde";
		die();
	}
	//If the connection is done
	//Insert the msg in the BD
	$sql = "INSERT INTO mails (name, email, message)
		VALUES ('$name', '$mail', '$msg')";

	if (mysqli_query($conn, $sql)) {
		//Send the Mail
		$message = "Name: " . $name . " \nMail:" . $mail . "\nMessage: " . $msg;
		$headers = 'From: webmaster@example.com' . "\r\n" 
				.'Reply-To: webmaster@example.com';

		if(!mail("jhuertasdeveloper@gmail.com", "Portfolio", $message,$headers)){
			echo "Ocurrio un error. Intentelo nuevamente mas tarde";
			die();
		}else{
			echo "Gracias por contactarme! le respondere dentro de las proximas 24hs";
		}
	} else {
		echo "Ocurrio un error. Intentelo nuevamente mas tarde";
		die();
	}
	
	
	
	

?>