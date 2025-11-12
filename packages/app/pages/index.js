import {
  Box,
  Button,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from "@mui/material";
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink } from "firebase/auth";
import Head from "next/head";
import React, { useEffect, useState } from "react";
import { auth } from "../lib/firebase";

/**
 * @purpose Home page with passwordless email authentication.
 * Demonstrates Firebase email link authentication flow.
 */
export default function Home() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is already signed in
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Check if this is a sign-in link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let emailForSignIn = window.localStorage.getItem("emailForSignIn");
      if (!emailForSignIn) {
        emailForSignIn = window.prompt("Please provide your email for confirmation");
      }
      
      if (emailForSignIn) {
        setLoading(true);
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(() => {
            window.localStorage.removeItem("emailForSignIn");
            setMessage("Successfully signed in!");
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch((error) => {
            console.error("Error signing in:", error);
            setMessage("Error signing in: " + error.message);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, []);

  const handleSendSignInLink = async () => {
    if (!email) {
      setMessage("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const actionCodeSettings = {
        url: window.location.href,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      setMessage("Check your email for a sign-in link!");
    } catch (error) {
      console.error("Error sending sign-in link:", error);
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setMessage("Signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      setMessage("Error signing out: " + error.message);
    }
  };

  if (checkingAuth) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Head>
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
        <meta content="Love Central Texas" name="description" />
        <title>Love Central Texas</title>
      </Head>

      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography component="h1" gutterBottom variant="h3">
          Love Central Texas
        </Typography>

        {!user ? (
          <>
            <Typography color="text.secondary" gutterBottom variant="body1">
              Welcome! Sign in with your email to get started.
            </Typography>

            <Box sx={{ mt: 4 }}>
              <TextField
                disabled={loading}
                fullWidth
                label="Email Address"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                type="email"
                value={email}
                variant="outlined"
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Button
                color="primary"
                disabled={loading}
                fullWidth
                onClick={handleSendSignInLink}
                size="large"
                variant="contained"
              >
                {loading ? <CircularProgress size={24} /> : "Send Sign-In Link"}
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Typography color="text.secondary" gutterBottom variant="body1">
              Hello, {user.email}!
            </Typography>

            <Box sx={{ mt: 4 }}>
              <Typography gutterBottom variant="h6">
                User Information
              </Typography>
              <Box
                sx={{
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  mt: 2,
                  p: 3,
                  textAlign: "left",
                }}
              >
                <Typography variant="body2">
                  <strong>Email:</strong> {user.email}
                </Typography>
                <Typography variant="body2">
                  <strong>User ID:</strong> {user.uid}
                </Typography>
                <Typography variant="body2">
                  <strong>Email Verified:</strong>{" "}
                  {user.emailVerified ? "Yes" : "No"}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 4 }}>
              <Button
                color="secondary"
                fullWidth
                onClick={handleSignOut}
                size="large"
                variant="outlined"
              >
                Sign Out
              </Button>
            </Box>
          </>
        )}

        {message && (
          <Box sx={{ mt: 3 }}>
            <Typography
              color={message.includes("Error") ? "error" : "primary"}
              variant="body1"
            >
              {message}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}

