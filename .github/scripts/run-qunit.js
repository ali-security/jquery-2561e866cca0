/*
 * Headless runner for the browser QUnit suite (test/index.html).
 * Loads the suite in headless Chrome (puppeteer), waits for QUnit to finish,
 * then prints one result line per test, every failed assertion and a summary.
 * Exits non-zero when any assertion failed or the suite did not complete.
 *
 * Usage: node .github/scripts/run-qunit.js http://127.0.0.1:8000/test/index.html
 */
"use strict";

var puppeteer = require( "puppeteer" );

var url = process.argv[ 2 ],
	timeoutMs = 30 * 60 * 1000;

async function main() {
	var browser = await puppeteer.launch({
		headless: true,
		args: [ "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
			// keep legacy unload handlers firing (tests #10080, #14379 rely on them)
			"--disable-features=DeprecateUnload,DeprecateUnloadByAllowList" ]
	});
	var page = await browser.newPage();

	page.on( "pageerror", function( err ) {
		console.log( "[pageerror] " + err.message );
	});

	console.log( "Loading " + url );
	await page.goto( url, { waitUntil: "load" } );

	await page.waitForFunction( function() {
		return !!document.querySelector( "#qunit-testresult .failed" );
	}, { timeout: timeoutMs, polling: 1000 } );

	var report = await page.evaluate( function() {
		var tests = [];
		Array.prototype.forEach.call( document.querySelectorAll( "#qunit-tests > li" ), function( li ) {
			var mod = li.querySelector( ".module-name" ),
				name = li.querySelector( ".test-name" ),
				counts = li.querySelector( ".counts" ),
				failures = [];
			Array.prototype.forEach.call( li.querySelectorAll( "ol > li.fail" ), function( a ) {
				failures.push( a.textContent.replace( /\s+/g, " " ).trim() );
			});
			tests.push({
				module: mod ? mod.textContent : "",
				name: name ? name.textContent : "",
				counts: counts ? counts.textContent : "",
				passed: li.className.indexOf( "pass" ) >= 0 && li.className.indexOf( "fail" ) < 0,
				failures: failures
			});
		});
		return {
			tests: tests,
			assertPassed: +document.querySelector( "#qunit-testresult .passed" ).textContent,
			assertTotal: +document.querySelector( "#qunit-testresult .total" ).textContent,
			assertFailed: +document.querySelector( "#qunit-testresult .failed" ).textContent
		};
	});

	var testsPassed = 0, testsFailed = 0;
	report.tests.forEach( function( t ) {
		if ( t.passed ) {
			testsPassed++;
		} else {
			testsFailed++;
		}
		console.log( ( t.passed ? "PASS" : "FAIL" ) + "  " + t.module + " :: " + t.name + " " + t.counts );
		t.failures.forEach( function( f ) {
			console.log( "        failed assertion: " + f );
		});
	});

	console.log( "" );
	console.log( "QUnit summary: " + report.tests.length + " tests, " + testsPassed + " passed, " +
		testsFailed + " failed; " + report.assertTotal + " assertions, " + report.assertPassed +
		" passed, " + report.assertFailed + " failed." );

	await browser.close();
	process.exit( report.assertFailed === 0 && report.tests.length > 0 ? 0 : 1 );
}

main().catch( function( err ) {
	console.error( err );
	process.exit( 1 );
});
