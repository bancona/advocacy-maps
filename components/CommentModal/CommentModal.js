import React, { useState, useLocation, useEffect } from "react"
import { Button, Modal } from "react-bootstrap"
import { useAuth } from "../../components/auth"
import { useProfile, useMember } from "../db"
import { useEditTestimony } from "../db/testimony/useEditTestimony"
import TweetComponent from "./TweetComponent"
import EmailToCommitteeComponent from "./EmailToCommitteeComponent"
import EmailToMyLegislatorsComponent from "./EmailToMyLegislatorsComponent"
import createMyLegislatorEmailCommand from "./createMyLegislatorEmailCommand"
import createCommitteeChairEmailCommand from "./createCommitteeChairEmailCommand"
import { siteUrl } from "../links"

const testimonyArchiveEmailAddress = "test@example.com" // in order to have emails send to legislators via BCC, we need a primary "send to" email address for each email.  This is a placeholder email address.  Ultimately, this should be in a configuration file.

const CommentModal = props => {
  const bill = props.bill
  const webSiteBillAddress = siteUrl(`bill?id=${bill.BillNumber}`)
  const [checkedSendToYourLegislators, setCheckedSendToYourLegislators] =
    React.useState(true)
  const [checkedSendToCommittee, setCheckedSendToCommittee] = React.useState(
    props.committeeName
  ) // only default checkbox to checked if the bill is in a committee

  const [checkedTweet, setCheckedTweet] = React.useState(true)

  const useTestimonyTemplate = true
  const testimonyTemplate = `Why I am qualified to provide testimony:

Why this bill is important to me:
  
My thoughts:
`
  const defaultTestimony = useTestimonyTemplate
    ? testimonyTemplate
    : "My comments on this bill..."
  const [testimony, setTestimony] = useState(
    props.testimony ? props.testimony : { content: defaultTestimony }
  )
  const [isPublishing, setIsPublishing] = useState(false)
  const committeeName = props.committeeName
  const houseChairEmail = props.houseChairEmail
  const senateChairEmail = props.senateChairEmail
  const showTestimony = props.showTestimony
  const handleCloseTestimony = props.handleCloseTestimony

  const { user, authenticated } = useAuth()
  const { profile } = useProfile()

  const senator = useMember(profile?.senator?.id)
  const representative = useMember(profile?.representative?.id)
  const senatorEmail = senator.member?.EmailAddress ?? ""
  const representativeEmail = representative.member?.EmailAddress ?? ""

  const edit = useEditTestimony(user ? user.uid : null, bill.BillNumber)

  useEffect(() => {
    const testimony = edit.draft ? edit.draft : defaultTestimony
    setTestimony(testimony)
  }, [defaultTestimony, edit.draft])

  const positionMessage = "Select my support..(required)"

  const positionEmailSubject =
    testimony?.position == "endorse"
      ? "Support of"
      : testimony?.position == "oppose"
      ? "Opposition to"
      : "Opinion on"

  const positionWord =
    testimony?.position == "endorse"
      ? "support"
      : testimony?.position == "oppose"
      ? "oppose"
      : "have thoughts on"

  const emailSuffix = `See more testimony on this bill at ${webSiteBillAddress}`

  const billNumber = bill?.BillNumber
  const billTitle = bill?.Title
  const testimonyContent = testimony?.content

  const emailCommandToMyLegislators = createMyLegislatorEmailCommand(
    representativeEmail,
    senatorEmail,
    positionWord,
    positionEmailSubject,
    billNumber,
    billTitle,
    testimonyContent,
    emailSuffix,
    testimonyArchiveEmailAddress
  )

  const emailCommandToCommitteeChairs = createCommitteeChairEmailCommand(
    houseChairEmail,
    senateChairEmail,
    committeeName,
    positionWord,
    positionEmailSubject,
    billNumber,
    billTitle,
    testimonyContent,
    emailSuffix,
    testimonyArchiveEmailAddress
  )

  const defaultPosition =
    testimony && testimony.position ? testimony.position : undefined
  const defaultContent =
    testimony && testimony.content ? testimony.content : defaultTestimony

  const tweet = encodeURI(
    `https://twitter.com/intent/tweet?text=I provided testimony on bill ${bill.BillNumber}: ${bill.Title}.
    
See ${webSiteBillAddress} for details.`
  )

  const publishTestimony = async () => {
    if (
      testimony.position == undefined ||
      testimony.position == positionMessage
    ) {
      return
    }
    setIsPublishing(true)
    await edit.saveDraft.execute(testimony)
    await edit.publishTestimony.execute()

    if (checkedSendToYourLegislators) {
      window.open(emailCommandToMyLegislators) // allow user to send a formatted email using their email client
    }
    if (checkedSendToCommittee && (houseChairEmail || senateChairEmail)) {
      window.open(emailCommandToCommitteeChairs) // allow user to send a formatted email using their email client
    }
    if (checkedTweet) {
      window.open(tweet)
    }

    handleCloseTestimony()
    setIsPublishing(false)
  }

  const positionChosen =
    testimony?.position != undefined && testimony.position != positionMessage

  return (
    <Modal show={showTestimony} onHide={handleCloseTestimony} size="lg">
      <Modal.Header closeButton onClick={handleCloseTestimony}>
        <Modal.Title>
          {"Add Your Testimony" +
            (bill ? " for " + bill.BillNumber + " - " + bill.Title : "")}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="container">
          <div className="row">
            <div className="col-sm align-middle">
              <select
                className="form-control"
                defaultValue={defaultPosition}
                onChange={e => {
                  const newPosition = e.target.value
                  if (newPosition) {
                    const testimonyObject = {
                      content: testimony.content,
                      senatorId: profile?.senator?.id,
                      representativeId: profile?.representative?.id,
                      senatorDistrict: profile?.senator?.district,
                      representativeDistrict: profile?.representative?.district,
                      position: newPosition
                    }
                    setTestimony(testimonyObject)
                  }
                }}
              >
                <option>{positionMessage}</option>
                <option value="endorse">Endorse</option>
                <option value="oppose">Oppose</option>
                <option value="neutral">Neutral</option>
              </select>
              <div>
                <EmailToMyLegislatorsComponent
                  checkedSendToYourLegislators={checkedSendToYourLegislators}
                  setCheckedSendToYourLegislators={
                    setCheckedSendToYourLegislators
                  }
                  senator={senator}
                  representative={representative}
                />
              </div>
              <div>
                <EmailToCommitteeComponent
                  checkedSendToCommittee={checkedSendToCommittee}
                  setCheckedSendToCommittee={setCheckedSendToCommittee}
                  committeeName={committeeName}
                />
              </div>
              <div>
                <TweetComponent
                  checkedTweet={checkedTweet}
                  setCheckedTweet={setCheckedTweet}
                />
              </div>
            </div>

            <div className="col-sm">
              <textarea
                className="form-control col-sm"
                resize="none"
                rows="20"
                required
                defaultValue={defaultContent}
                onChange={e => {
                  const newText = e.target.value
                  const testimonyObject = {
                    position: testimony.position,
                    senatorId: profile?.senator?.id,
                    representativeId: profile?.representative?.id,
                    senatorDistrict: profile?.senator?.district,
                    representativeDistrict: profile?.representative?.district,
                    content: newText
                  }
                  setTestimony(testimonyObject)
                }}
              />
              <Button className="mt-2">Upload a document</Button>
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="primary" onClick={publishTestimony}>
          {!positionChosen
            ? "Choose Endorse/Oppose/Neutral to Publish"
            : !isPublishing
            ? "Publish"
            : "Publishing.."}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default CommentModal
