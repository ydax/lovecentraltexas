import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { AppCacheProvider } from "@mui/material-nextjs/v14-pagesRouter";
import Head from "next/head";
import PropTypes from "prop-types";
import React from "react";

/**
 * @purpose Main App component that wraps all pages.
 * Provides Material UI theme and handles client-side hydration.
 */

// Create a Material UI v6 theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#FF6B6B",
    },
    secondary: {
      main: "#4ECDC4",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

export default function MyApp({ Component, pageProps }) {
  return (
    <AppCacheProvider>
      <Head>
        <meta
          content="initial-scale=1.0, width=device-width, minimum-scale=1.0"
          name="viewport"
        />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </AppCacheProvider>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};

