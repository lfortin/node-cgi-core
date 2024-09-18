describe("HTTP response status", () => {
  it("should get status 200 on specific script path", () => {
    cy.request({
      url: "/cgi-bin/env.js",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200);
    });
  });
  it("should get status 200 on index script", () => {
    cy.request({
      url: "/cgi-bin",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200);
    });
  });
  it("should get status 403 forbidden on specific script path", () => {
    cy.request({
      url: "/cgi-bin/forbidden.js",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(403);
      //expect(response.body).to.have.property("error", "Not Found");
    });
  });
  it("should get status 404 Not Found", () => {
    cy.request({
      url: "/cgi-bin/invalid-path.js",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(404);
      expect(response.body).to.equal("Not Found");
    });
  });
  it("should get status 200 outside of url path", () => {
    cy.request({
      url: "/outside-urlpath",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200);
    });
  });
});
describe("HTTP response body", () => {
  it("should have html payload", () => {
    // Intercept the request to the specific API endpoint
    cy.intercept("GET", "/cgi-bin/env.js?test1=123&test2=12345").as("getData");

    // Trigger the action that sends the request
    cy.visit("/cgi-bin/env.js?test1=123&test2=12345");

    // Wait for the intercepted request and assert the response status
    //cy.wait("@getData").its("response.statusCode").should("eq", 200);
    cy.wait("@getData").then((interception) => {
      expect(interception.response.statusCode).to.be.equal(200);
      expect(interception.response.body).to.not.be.undefined;
    });
  });
});
