import {expect,test,type Browser,type BrowserContext,type Page} from "@playwright/test";
import {mkdirSync} from "node:fs";

function futureWeekday(offset:number) {
  const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()+offset);
  while(date.getDay()===0)date.setDate(date.getDate()+1);
  return date.toISOString().slice(0,10);
}
function shiftDay(date:string,offset:number) {const value=new Date(`${date}T12:00:00`);value.setDate(value.getDate()+offset);while(value.getDay()===0)value.setDate(value.getDate()+1);return value.toISOString().slice(0,10);}
function calendarMonth(date:string) {return new Intl.DateTimeFormat("en-IN",{month:"long",year:"numeric",timeZone:"Asia/Kolkata"}).format(new Date(`${date}T12:00:00+05:30`));}
async function moveCalendarTo(page:Page,date:string) {
  const heading=page.locator(".calendar-toolbar h3"),wanted=calendarMonth(date);
  for(let i=0;i<14&&(await heading.innerText())!==wanted;i++)await page.getByRole("button",{name:"Next month"}).click();
  await expect(heading).toHaveText(wanted);
}
async function fillEventBrief(page:Page,date:string) {
  await page.getByLabel(/What are you calling it/).fill("Organizer browser journey");
  await page.locator(".brief-form select").nth(1).selectOption({label:"Workshop"});
  await page.getByLabel(/Who’s coming/).fill("Local community makers");
  await page.getByLabel(/Event date/).fill(date);
  await page.getByLabel(/Expected guests/).fill("20");
  await page.getByLabel(/Budget for the space/).fill("10000");
}
async function selectOptionMatching(page:Page,selectLabel:string,pattern:RegExp) {
  const select=page.getByLabel(selectLabel);
  const options=await select.locator("option").evaluateAll((items)=>items.map((item)=>({label:item.textContent||"",value:(item as HTMLOptionElement).value})));
  const match=options.find((option)=>pattern.test(option.label));
  expect(match,`an option matching ${pattern} should exist`).toBeTruthy();
  await select.selectOption(match!.value);
}
async function switchRole(page:Page,role:"organizer"|"host") {
  await page.getByLabel("Simulation role").selectOption(role);
  await expect(page.getByLabel("Simulation role")).toHaveValue(role);
  await expect(page.getByRole("status").filter({hasText:`Simulation role changed to ${role}`})).toBeVisible();
}
async function cloneWorkspaceContext(browser:Browser,source:BrowserContext) {
  const context=await browser.newContext({viewport:{width:1365,height:900}});
  await context.addCookies(await source.cookies());
  const brief=await source.pages()[0]?.evaluate(()=>localStorage.getItem("backstage.event-brief.v1"));
  await context.addInitScript((savedBrief)=>{if(savedBrief)localStorage.setItem("backstage.event-brief.v1",savedBrief);},brief||null);
  return context;
}

test("organizer brief, host review, shared resources, cancellation, and mobile calendar",async({browser})=>{
  const artifactDir=process.env.PLAYWRIGHT_ARTIFACT_DIR||".playwright-artifacts";mkdirSync(artifactDir,{recursive:true});
  const date=futureWeekday(10),alternateDate=shiftDay(date,14),flexEnd=shiftDay(date,25);
  const organizerContext=await browser.newContext({viewport:{width:1365,height:900}});
  let hostContext:BrowserContext|undefined;
  try {
    const organizer=await organizerContext.newPage();await organizer.goto("/organizer");
    await expect(organizer.getByRole("heading",{name:/Let’s make a little room/})).toBeVisible();
    const briefForm=organizer.locator(".brief-form");
    await briefForm.getByRole("button",{name:/Save event brief/}).click();
    expect(await briefForm.locator("input[required]").first().evaluate((element:HTMLInputElement)=>element.validity.valueMissing)).toBe(true);
    expect(await organizer.evaluate(()=>localStorage.getItem("backstage.event-brief.v1"))).toBeNull();

    await fillEventBrief(organizer,date);await briefForm.getByRole("button",{name:/Save event brief/}).click();
    await expect(organizer.getByRole("status").filter({hasText:"Your event brief is saved"})).toBeVisible();
    await organizer.reload();
    await expect(organizer.getByLabel(/What are you calling it/)).toHaveValue("Organizer browser journey");
    await expect(organizer.locator(".brief-form").getByLabel(/Event date/)).toHaveValue(date);
    await organizer.screenshot({path:`${artifactDir}/organizer-saved-brief.png`,fullPage:true});

    await selectOptionMatching(organizer,"Potential host",/RESEARCH LEAD.*Masters’ Union Campus/);
    await organizer.getByRole("button",{name:"Load saved event brief"}).click();
    await organizer.getByLabel("Organizer name").fill("Browser Test Organizer");
    await organizer.getByLabel("Email",{exact:true}).fill("organizer@example.test");
    await organizer.getByRole("button",{name:"Save application draft"}).click();
    const researchCard=organizer.locator(".application-card").filter({hasText:"Masters’ Union Campus"});
    await expect(researchCard).toContainText("DRAFT ONLY");
    await expect(organizer.getByRole("button",{name:"Submit demo request"})).toBeDisabled();
    await expect(researchCard.getByRole("link").first()).toHaveAttribute("href","https://mastersunion.org/for-companies");

    await organizer.getByRole("button",{name:"Start a new application draft"}).click();
    await organizer.getByRole("button",{name:"Load saved event brief"}).click();
    await selectOptionMatching(organizer,"Potential host",/FICTIONAL DEMO.*Backstage Demo House/);
    await organizer.getByLabel("Event title").fill("First approved event");
    await organizer.getByLabel(/Workshop Studio/).check();
    await organizer.getByLabel(/Projector · equipment/).check();
    await organizer.getByLabel("Organizer name").fill("Browser Test Organizer");
    await organizer.getByLabel("Email",{exact:true}).fill("organizer@example.test");
    await organizer.getByLabel("Flexible date from").fill(shiftDay(date,1));
    await organizer.getByLabel("Flexible date through").fill(flexEnd);
    await organizer.getByLabel("Flexible start time").fill("09:00");
    await organizer.getByLabel("Flexible end time").fill("16:00");
    await organizer.getByLabel(/I have reviewed the brief snapshot/).check();
    await organizer.getByRole("button",{name:"Submit demo request"}).click();
    const firstCard=organizer.locator(".application-card").filter({hasText:"First approved event"});
    await expect(firstCard).toContainText("submitted");
    await expect(firstCard).toContainText("FICTIONAL DEMO");

    hostContext=await cloneWorkspaceContext(browser,organizerContext);
    const host=await hostContext.newPage();await host.goto("/host");await switchRole(host,"host");
    const incoming=host.locator(".application-card").filter({hasText:"First approved event"});
    await expect(incoming).toBeVisible();
    await incoming.getByRole("button",{name:"Request information"}).click();
    await expect(incoming).toContainText("needs information");
    await expect(host.getByLabel("Reply to the host")).toHaveCount(0);

    await switchRole(host,"organizer");
    const replyCard=host.locator(".application-card").filter({hasText:"First approved event"});
    await replyCard.getByLabel("Reply to the host").fill("The workshop is open to local makers; projector input is standard HDMI.");
    await replyCard.getByRole("button",{name:"Send response"}).click();
    await expect(replyCard).toContainText("Organizer response: The workshop is open to local makers");
    await switchRole(host,"host");
    const incomingAgain=host.locator(".application-card").filter({hasText:"First approved event"});
    await incomingAgain.getByRole("button",{name:"Approve & allocate"}).click();
    const confirmed=host.getByRole("heading",{name:/Confirmed events/}).locator("..")
      .locator(".application-card").filter({hasText:"First approved event"});
    await expect(confirmed).toBeVisible();
    await expect(confirmed.getByText("Accepted brief snapshot")).toBeVisible();
    const hostTask=confirmed.getByRole("checkbox",{name:/host task: Confirm room layout/});
    const organizerTask=confirmed.getByRole("checkbox",{name:/organizer task: Share arrival/});
    await expect(hostTask).toBeEnabled();await expect(organizerTask).toBeDisabled();
    await hostTask.click();await expect(hostTask).toBeChecked();
    await switchRole(host,"organizer");
    const organizerConfirmed=host.locator(".application-card").filter({hasText:"First approved event"});
    await expect(organizerConfirmed.getByRole("checkbox",{name:/host task: Confirm room layout/})).toBeChecked();
    const organizerShare=organizerConfirmed.getByRole("checkbox",{name:/organizer task: Share arrival/});
    await expect(organizerShare).toBeEnabled();await organizerShare.click();await expect(organizerShare).toBeChecked();

    await host.getByRole("button",{name:"Start a new application draft"}).click();
    await host.getByRole("button",{name:"Load saved event brief"}).click();
    await selectOptionMatching(host,"Potential host",/FICTIONAL DEMO.*Backstage Demo House/);
    await host.getByLabel("Event title").fill("Shared projector conflict");
    await host.getByLabel(/Gathering Salon/).check();
    await host.getByLabel(/Projector · equipment/).check();
    await host.getByLabel("Organizer name").fill("Browser Test Organizer");
    await host.getByLabel("Email",{exact:true}).fill("organizer@example.test");
    await host.getByLabel("Flexible date from").fill(shiftDay(date,1));
    await host.getByLabel("Flexible date through").fill(flexEnd);
    await host.getByLabel("Flexible start time").fill("09:00");
    await host.getByLabel("Flexible end time").fill("16:00");
    await host.getByLabel(/I have reviewed the brief snapshot/).check();
    await host.getByRole("button",{name:"Submit demo request"}).click();
    await switchRole(host,"host");
    const conflict=host.locator(".application-card").filter({hasText:"Shared projector conflict"});
    await conflict.getByRole("button",{name:"Approve & allocate"}).click();
    await expect(host.locator(".ops-feedback[role=alert]")).toContainText("Conflict on Projector");
    await conflict.getByLabel("Proposed date").fill(alternateDate);
    await conflict.getByLabel("From",{exact:true}).fill("13:00");
    await conflict.getByLabel("Until",{exact:true}).fill("15:00");
    await conflict.getByRole("button",{name:"Propose this slot"}).click();
    await expect(conflict).toContainText("alternative proposed");
    await switchRole(host,"organizer");
    const proposed=host.locator(".application-card").filter({hasText:"Shared projector conflict"});
    await proposed.getByRole("button",{name:"Accept proposed alternative"}).click();
    await switchRole(host,"host");
    await host.locator(".application-card").filter({hasText:"Shared projector conflict"}).getByRole("button",{name:"Approve & allocate"}).click();
    const secondConfirmed=host.getByRole("heading",{name:/Confirmed events/}).locator("..")
      .locator(".application-card").filter({hasText:"Shared projector conflict"});
    await expect(secondConfirmed).toContainText("Accepted brief snapshot");
    await expect(secondConfirmed).toContainText(alternateDate);

    await moveCalendarTo(host,alternateDate);
    await selectOptionMatching(host,"Filter resource",/Backstage Demo House.*Projector/);
    await expect(host.locator(".calendar-confirmed-reservation")).toHaveCount(2);
    const filteredItems=await host.locator(".calendar-item").allInnerTexts();
    expect(filteredItems.every((text)=>text.includes("Projector"))).toBe(true);
    const alternativeScreenshot=`${artifactDir}/host-calendar-before-cancel.png`;
    await host.screenshot({path:alternativeScreenshot,fullPage:true});

    await switchRole(host,"organizer");
    await host.locator(".application-card").filter({hasText:"Shared projector conflict"}).getByRole("button",{name:"Cancel request"}).click();
    await switchRole(host,"host");await moveCalendarTo(host,alternateDate);
    await selectOptionMatching(host,"Filter resource",/Backstage Demo House.*Projector/);
    await expect(host.locator(".calendar-confirmed-reservation")).toHaveCount(1);

    const available=host.locator(".calendar-availability").filter({has:host.getByRole("button",{name:"Withdraw availability"})}).first();
    await expect(available).toBeVisible();
    const previousAvailabilityCount=await host.locator(".calendar-availability").count();
    await available.getByRole("button",{name:"Withdraw availability"}).click();
    await expect(host.locator(".calendar-availability")).toHaveCount(previousAvailabilityCount-1);
    await expect(host.getByText(/Withdraw a window to stop offering it/)).toBeVisible();

    await host.setViewportSize({width:390,height:844});
    await expect(host.getByRole("heading",{name:/Review the requests/})).toBeVisible();
    const dimensions=await host.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));
    expect(dimensions.scrollWidth,JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width);
    await host.screenshot({path:`${artifactDir}/host-calendar-mobile.png`,fullPage:true});
    await switchRole(host,"organizer");
    await organizer.setViewportSize({width:390,height:844});
    await expect(organizer.getByLabel(/What are you calling it/)).toBeVisible();
    const organizerDimensions=await organizer.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));
    expect(organizerDimensions.scrollWidth,JSON.stringify(organizerDimensions)).toBeLessThanOrEqual(organizerDimensions.width);
    await organizer.screenshot({path:`${artifactDir}/organizer-mobile.png`,fullPage:true});
  } finally {
    await hostContext?.close();await organizerContext.close();
  }
});
